import type {
  DiagnosticMessage,
  FirmwareFileData,
  HardwareConfig,
  PersistedModuleState,
  RuntimeEventRecord,
  RuntimeSnapshot,
  SerialLogEntry,
  SimulationState,
  TouchEventRecord,
  VirtualPinState,
} from "../types";
import type {
  BlockStmt,
  Expression,
  FunctionDecl,
  ParsedProgram,
  Statement,
  StructOrClassDecl,
  VarDecl,
} from "../parser/ast";
import { parseFirmwareProject } from "../parser/parser";
import { VirtualSSD1306, SSD1306_BLACK, SSD1306_INVERSE, SSD1306_WHITE } from "../oled/ssd1306";
import { virtualAudio } from "../audio/webAudio";
import { getDefaultPersistedModules } from "../modules/registry";

// Runtime Value types
interface ObjectValue {
  __kind: "object";
  className: string;
  fields: Record<string, RuntimeValue>;
}

interface ArrayValue {
  __kind: "array";
  elements: RuntimeValue[];
}

type RuntimeValue = number | string | boolean | null | ObjectValue | ArrayValue;

interface ExecYield {
  type: "slice" | "delay" | "halt";
  delayMs?: number;
}

class ControlSignal {
  constructor(
    public readonly kind: "return" | "break" | "continue",
    public readonly value: RuntimeValue = null
  ) {}
}

class FirmwareRuntimeError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly line: number
  ) {
    super(message);
  }
}

interface EnvFrame {
  vars: Map<string, { type: string; value: RuntimeValue }>;
  parent: EnvFrame | null;
}

function isObjectValue(v: RuntimeValue): v is ObjectValue {
  return typeof v === "object" && v !== null && "__kind" in v && v.__kind === "object";
}

function isArrayValue(v: RuntimeValue): v is ArrayValue {
  return typeof v === "object" && v !== null && "__kind" in v && v.__kind === "array";
}

function toNumber(v: RuntimeValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function toBool(v: RuntimeValue): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  return v !== null;
}

function toDisplayString(v: RuntimeValue): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return Number(v.toFixed(2)).toString();
  }
  if (typeof v === "string") return v;
  if (isArrayValue(v)) return `[Array(${v.elements.length})]`;
  if (isObjectValue(v)) return `<${v.className}>`;
  return String(v);
}

function formatVarPreview(v: RuntimeValue): string {
  if (isArrayValue(v)) {
    const head = v.elements.slice(0, 6).map(toDisplayString).join(", ");
    return `[${head}${v.elements.length > 6 ? `, … (${v.elements.length})` : ""}]`;
  }
  if (isObjectValue(v)) {
    const keys = Object.keys(v.fields).slice(0, 4);
    const kv = keys.map((k) => `${k}:${toDisplayString(v.fields[k])}`).join(", ");
    return `${v.className}{${kv}}`;
  }
  if (typeof v === "string") return `"${v}"`;
  return String(v);
}

const ARDUINO_CONSTANTS: Record<string, number> = {
  HIGH: 1,
  LOW: 0,
  INPUT: 0,
  OUTPUT: 1,
  INPUT_PULLUP: 2,
  INPUT_PULLDOWN: 3,
  LED_BUILTIN: 2,
  SDA: 21,
  SCL: 22,
  SSD1306_BLACK,
  SSD1306_WHITE,
  SSD1306_INVERSE,
  BLACK: 0,
  WHITE: 1,
  INVERSE: 2,
  SSD1306_SWITCHCAPVCC: 2,
  SSD1306_EXTERNALVCC: 1,
  PI: Math.PI,
  HALF_PI: Math.PI / 2,
  TWO_PI: Math.PI * 2,
  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,
  RISING: 1,
  FALLING: 2,
  CHANGE: 3,
  WL_IDLE_STATUS: 0,
  WL_NO_SSID_AVAIL: 1,
  WL_CONNECTED: 3,
  WL_DISCONNECTED: 6,
  WIFI_STA: 1,
  WIFI_AP: 2,
  DEC: 10,
  HEX: 16,
  BIN: 2,
  OCT: 8,
  A0: 36,
  A3: 39,
  A4: 32,
  A5: 33,
  A6: 34,
  A7: 35,
  T0: 4,
  T1: 0,
  T2: 2,
  T3: 15,
  T4: 13,
  T5: 12,
  T6: 14,
  T7: 27,
  T8: 33,
  T9: 32,
  portTICK_PERIOD_MS: 1,
};

export class EmoFirmwareRuntime {
  public readonly oled: VirtualSSD1306;
  public state: SimulationState = "IDLE";
  public simTimeMs = 0;
  public loopIterations = 0;
  public instructionsExecuted = 0;
  public lastError: DiagnosticMessage | null = null;

  public serialLogs: SerialLogEntry[] = [];
  public touchHistory: TouchEventRecord[] = [];
  public eventHistory: RuntimeEventRecord[] = [];

  private serialRxQueue: string[] = [];
  private serialLineBuf = "";
  private logSeq = 0;

  private hardwareConfig: HardwareConfig;
  private modulesMap: Map<string, PersistedModuleState>;
  private activeModulesSet = new Set<string>();
  private warnedUnsupportedApis = new Set<string>();

  private program: ParsedProgram | null = null;
  private globalEnv: EnvFrame = { vars: new Map(), parent: null };
  private functions = new Map<string, FunctionDecl>();
  private structs = new Map<string, StructOrClassDecl>();
  private staticLocals = new Map<string, RuntimeValue>();

  private generator: Generator<ExecYield, void, void> | null = null;
  private wakeAtSimMs = 0;
  private delayedInCurrentLoop = false;
  private callDepth = 0;
  private maxCallStackDepth = 64;
  private maxInstructionsPerTick = 24000;
  private tickInstructions = 0;

  // Virtual Hardware State
  private pins: Record<number, VirtualPinState> = {};
  private nvsStorage: Record<string, Record<string, string | number | boolean>> = {};
  private eepromBuffer = new Uint8Array(512);
  private ledcChannels = new Map<number, { pin: number; freq: number; duty: number }>();
  private servos: Record<number, number> = {};
  private imu = { ax: 0, ay: 0, az: 16384, gx: 0, gy: 0, gz: 0 };
  private wifiMock = { connected: false, ssid: "", ip: "0.0.0.0", rssi: -52 };
  private i2cTargetAddr = 0;
  private i2cRxBuffer: number[] = [];
  private interrupts = new Map<number, { mode: number; fnName: string }>();

  private audioState = {
    buzzerActive: false,
    buzzerFreqHz: 0,
    buzzerStopAtMs: 0,
    speakerActive: false,
    speakerFreqHz: 0,
    micLevel: 120,
  };

  private rngState = 1337;
  private onStateUpdate?: () => void;

  constructor(
    hardwareConfig: HardwareConfig,
    modules?: PersistedModuleState[],
    onStateUpdate?: () => void
  ) {
    this.hardwareConfig = hardwareConfig;
    this.oled = new VirtualSSD1306(hardwareConfig.oled.width || 128, hardwareConfig.oled.height || 64);
    const list = modules && modules.length > 0 ? modules : getDefaultPersistedModules();
    this.modulesMap = new Map(list.map((m) => [m.id, m]));
    this.onStateUpdate = onStateUpdate;
    this.initPins();
  }

  public setLimits(maxInstructionsPerTick: number, maxCallStackDepth: number): void {
    this.maxInstructionsPerTick = Math.max(1000, Math.min(200000, maxInstructionsPerTick));
    this.maxCallStackDepth = Math.max(16, Math.min(256, maxCallStackDepth));
  }

  public updateModules(modules: PersistedModuleState[]): void {
    this.modulesMap = new Map(modules.map((m) => [m.id, m]));
  }

  public updateHardwareConfig(cfg: HardwareConfig): void {
    this.hardwareConfig = cfg;
    virtualAudio.muted = cfg.audio.muted;
    virtualAudio.volume = cfg.audio.volume;
    // Update battery ADC pin reading immediately
    this.updateBatteryAdcPin();
    this.applyPinLabels();
  }

  private initPins(): void {
    this.pins = {};
    for (let p = 0; p <= 39; p++) {
      this.pins[p] = {
        pin: p,
        mode: "UNCONFIGURED",
        digitalValue: 0,
        analogValue: 0,
        pwmValue: 0,
        touchValue: 74, // Capacitive idle baseline
      };
    }
    this.applyPinLabels();
    this.updateBatteryAdcPin();
  }

  private applyPinLabels(): void {
    for (let p = 0; p <= 39; p++) {
      if (this.pins[p]) this.pins[p].label = undefined;
    }
    const cfg = this.hardwareConfig;
    if (this.pins[cfg.oled.sdaPin]) this.pins[cfg.oled.sdaPin].label = "OLED SDA";
    if (this.pins[cfg.oled.sclPin]) this.pins[cfg.oled.sclPin].label = "OLED SCL";
    if (this.pins[cfg.touch.mainTouchPin]) {
      this.pins[cfg.touch.mainTouchPin].label = "MAIN TOUCH";
      this.pins[cfg.touch.mainTouchPin].digitalValue = cfg.touch.touchActive === "HIGH" ? 0 : 1;
    }
    if (this.pins[cfg.touch.wakeTouchPin]) {
      this.pins[cfg.touch.wakeTouchPin].label = "WAKE TOUCH";
      this.pins[cfg.touch.wakeTouchPin].digitalValue = cfg.touch.touchActive === "HIGH" ? 0 : 1;
    }
    if (this.pins[cfg.audio.buzzerPin]) this.pins[cfg.audio.buzzerPin].label = "BUZZER";
    if (this.pins[cfg.audio.speakerPin]) this.pins[cfg.audio.speakerPin].label = "SPEAKER";
    if (this.pins[cfg.audio.microphonePin]) this.pins[cfg.audio.microphonePin].label = "MIC ADC";
    if (this.pins[cfg.battery.adcPin]) this.pins[cfg.battery.adcPin].label = "BATTERY ADC";
    if (this.pins[2]) this.pins[2].label = "LED_BUILTIN";
  }

  private updateBatteryAdcPin(): void {
    const pct = Math.max(0, Math.min(100, this.hardwareConfig.battery.levelPercent));
    const packMv = 3300 + Math.round((pct / 100) * 900); // 3.3V .. 4.2V
    const dividerMv = Math.round(packMv / 2); // 1650mV .. 2100mV
    const adc12 = Math.round((dividerMv / 3300) * 4095);
    const pin = this.pins[this.hardwareConfig.battery.adcPin];
    if (pin) pin.analogValue = Math.max(0, Math.min(4095, adc12));
  }

  private isModuleEnabled(id: string): boolean {
    return Boolean(this.modulesMap.get(id)?.enabled);
  }

  private markModuleActive(id: string): void {
    this.activeModulesSet.add(id);
  }

  private logEvent(
    category: RuntimeEventRecord["category"],
    message: string,
    file?: string,
    line?: number
  ): void {
    this.logSeq++;
    this.eventHistory.push({
      id: `evt_${this.logSeq}`,
      timestampMs: Math.round(this.simTimeMs),
      category,
      message,
      file,
      line,
    });
    if (this.eventHistory.length > 400) {
      this.eventHistory.shift();
    }
  }

  private pushSerial(direction: SerialLogEntry["direction"], text: string): void {
    this.logSeq++;
    const now = new Date();
    const wallTime = now.toTimeString().slice(0, 8);
    this.serialLogs.push({
      id: `ser_${this.logSeq}`,
      timestampMs: Math.round(this.simTimeMs),
      wallTime,
      direction,
      text,
    });
    if (this.serialLogs.length > 600) {
      this.serialLogs.shift();
    }
  }

  private warnUnsupported(api: string, moduleId: string, file: string, line: number): void {
    const key = `${moduleId}:${api}`;
    if (this.warnedUnsupportedApis.has(key)) return;
    this.warnedUnsupportedApis.add(key);
    const msg = `[UNSUPPORTED API] ${api}() at ${file}:${line} — simulator module '${moduleId}' is disabled. Open Capability Center to implement or inspect support.`;
    this.logEvent("warning", msg, file, line);
    this.pushSerial("warn", msg);
  }

  public clearLogs(): void {
    this.serialLogs = [];
  }

  public pushSerialInput(text: string): void {
    this.pushSerial("tx", text);
    for (const ch of text) {
      this.serialRxQueue.push(ch);
    }
    this.serialRxQueue.push("\n");
  }

  public setTouchSensor(
    sensor: "MAIN_TOUCH" | "WAKE_TOUCH",
    pressed: boolean,
    eventType?: TouchEventRecord["eventType"]
  ): void {
    const pinNum =
      sensor === "MAIN_TOUCH"
        ? this.hardwareConfig.touch.mainTouchPin
        : this.hardwareConfig.touch.wakeTouchPin;
    const activeHigh = this.hardwareConfig.touch.touchActive === "HIGH";
    const newDigital: 0 | 1 = activeHigh ? (pressed ? 1 : 0) : pressed ? 0 : 1;
    const newTouchVal = pressed ? 14 : 74;

    const pin = this.pins[pinNum];
    if (pin) {
      const prev = pin.digitalValue;
      pin.digitalValue = newDigital;
      pin.touchValue = newTouchVal;
      this.checkPinInterrupt(pinNum, prev, newDigital);
    }

    this.markModuleActive("touch_capacitive");
    this.logSeq++;
    this.touchHistory.push({
      id: `tch_${this.logSeq}`,
      timestampMs: Math.round(this.simTimeMs),
      sensor,
      pin: pinNum,
      eventType: eventType ?? (pressed ? "PRESS" : "RELEASE"),
      value: newDigital,
    });
    if (this.touchHistory.length > 150) this.touchHistory.shift();
    this.logEvent(
      "touch",
      `${sensor} (GPIO${pinNum}) -> ${eventType ?? (pressed ? "PRESS" : "RELEASE")} [digital=${newDigital}, cap=${newTouchVal}]`
    );
    this.onStateUpdate?.();
  }

  public setExternalDigitalPin(pinNum: number, value: 0 | 1): void {
    const pin = this.pins[pinNum];
    if (!pin) return;
    const prev = pin.digitalValue;
    pin.digitalValue = value;
    this.checkPinInterrupt(pinNum, prev, value);
    this.logEvent("gpio", `Hardware Lab set GPIO${pinNum} = ${value === 1 ? "HIGH" : "LOW"}`);
    this.onStateUpdate?.();
  }

  public setExternalAnalogPin(pinNum: number, value: number): void {
    const pin = this.pins[pinNum];
    if (!pin) return;
    pin.analogValue = Math.max(0, Math.min(4095, Math.round(value)));
    this.onStateUpdate?.();
  }

  public setMicLevel(level: number): void {
    this.audioState.micLevel = Math.max(0, Math.min(4095, Math.round(level)));
    const micPin = this.pins[this.hardwareConfig.audio.microphonePin];
    if (micPin) micPin.analogValue = this.audioState.micLevel;
    this.onStateUpdate?.();
  }

  public setImuValues(partial: Partial<typeof this.imu>): void {
    this.imu = { ...this.imu, ...partial };
    this.onStateUpdate?.();
  }

  private checkPinInterrupt(pinNum: number, prev: 0 | 1, next: 0 | 1): void {
    if (!this.isModuleEnabled("rtos_interrupts")) return;
    const isr = this.interrupts.get(pinNum);
    if (!isr) return;
    const triggered =
      (isr.mode === 1 && prev === 0 && next === 1) || // RISING
      (isr.mode === 2 && prev === 1 && next === 0) || // FALLING
      (isr.mode === 3 && prev !== next); // CHANGE
    if (triggered && this.state === "RUNNING") {
      const fn = this.functions.get(isr.fnName);
      if (fn && fn.body) {
        // Run brief ISR synchronously within safety cap
        try {
          const gen = this.callUserFunction(fn, [], null);
          let steps = 0;
          while (steps < 2000) {
            const res = gen.next();
            if (res.done) break;
            steps++;
          }
          this.logEvent("gpio", `Cooperative ISR '${isr.fnName}' invoked on GPIO${pinNum}`);
        } catch (err) {
          this.logEvent("error", `ISR '${isr.fnName}' error: ${String(err)}`);
        }
      }
    }
  }

  /**
   * Builds execution plan from firmware files (AST parse + global initialization check).
   * Explicitly does NOT claim native C++ compilation.
   */
  public build(files: FirmwareFileData[]): { ok: boolean; diagnostics: DiagnosticMessage[] } {
    this.stop();
    this.oled.reset();
    this.initPins();
    this.activeModulesSet.clear();
    this.warnedUnsupportedApis.clear();
    this.staticLocals.clear();
    this.interrupts.clear();
    this.lastError = null;
    this.simTimeMs = 0;
    this.loopIterations = 0;
    this.instructionsExecuted = 0;

    const parsed = parseFirmwareProject(files);
    const blockingErrors = parsed.diagnostics.filter(
      (d) => d.severity === "error" && (d.category === "syntax" || d.category === "missing_dependency")
    );

    if (files.length === 0) {
      const err: DiagnosticMessage = {
        id: "build_no_files",
        severity: "error",
        category: "semantic",
        file: "",
        line: 1,
        column: 1,
        message: "No firmware files imported. Use IMPORT CODE before building.",
      };
      this.lastError = err;
      this.state = "ERROR";
      return { ok: false, diagnostics: [err] };
    }

    if (blockingErrors.length > 0) {
      this.lastError = blockingErrors[0];
      this.state = "ERROR";
      this.logEvent("error", `Build failed: ${blockingErrors[0].message}`, blockingErrors[0].file, blockingErrors[0].line);
      return { ok: false, diagnostics: parsed.diagnostics };
    }

    this.program = parsed;
    this.functions.clear();
    this.structs.clear();
    this.globalEnv = { vars: new Map(), parent: null };

    // Register built-in Arduino constants
    for (const [k, v] of Object.entries(ARDUINO_CONSTANTS)) {
      this.globalEnv.vars.set(k, { type: "const int", value: v });
    }

    // Register #define numeric/string macros
    for (const def of parsed.defines) {
      if (def.params) continue;
      const val = this.evalMacroValue(def.value);
      this.globalEnv.vars.set(def.name, { type: "#define", value: val });
    }

    // Register built-in singleton hardware objects
    this.globalEnv.vars.set("Serial", {
      type: "HardwareSerial",
      value: { __kind: "object", className: "HardwareSerial", fields: {} },
    });
    this.globalEnv.vars.set("Wire", {
      type: "TwoWire",
      value: { __kind: "object", className: "TwoWire", fields: {} },
    });
    this.globalEnv.vars.set("SPI", {
      type: "SPIClass",
      value: { __kind: "object", className: "SPIClass", fields: {} },
    });
    this.globalEnv.vars.set("EEPROM", {
      type: "EEPROMClass",
      value: { __kind: "object", className: "EEPROMClass", fields: {} },
    });
    this.globalEnv.vars.set("WiFi", {
      type: "WiFiClass",
      value: { __kind: "object", className: "WiFiClass", fields: {} },
    });
    this.globalEnv.vars.set("ESP", {
      type: "EspClass",
      value: { __kind: "object", className: "EspClass", fields: {} },
    });

    // Register Enums, Structs/Classes, and Functions
    for (const decl of parsed.declarations) {
      if (decl.kind === "EnumDecl") {
        let nextVal = 0;
        for (const m of decl.members) {
          if (m.value) {
            const evalVal = this.evalSyncConst(m.value);
            if (typeof evalVal === "number") nextVal = evalVal;
          }
          this.globalEnv.vars.set(m.name, { type: decl.name, value: nextVal });
          this.globalEnv.vars.set(`${decl.name}::${m.name}`, { type: decl.name, value: nextVal });
          nextVal++;
        }
      } else if (decl.kind === "StructOrClassDecl") {
        this.structs.set(decl.name, decl);
      } else if (decl.kind === "FunctionDecl" && decl.body) {
        this.functions.set(decl.name, decl);
      }
    }

    if (!this.functions.has("setup") || !this.functions.has("loop")) {
      const missing = !this.functions.has("setup") ? "setup()" : "loop()";
      const err: DiagnosticMessage = {
        id: "build_missing_entry",
        severity: "error",
        category: "semantic",
        file: files[0].path,
        line: 1,
        column: 1,
        message: `Cannot build execution plan: required function '${missing}' is missing.`,
      };
      this.lastError = err;
      this.state = "ERROR";
      return { ok: false, diagnostics: [...parsed.diagnostics, err] };
    }

    // Initialize global variables
    try {
      for (const decl of parsed.declarations) {
        if (decl.kind === "VarDecl") {
          const val = this.initVarSync(decl, this.globalEnv);
          this.globalEnv.vars.set(decl.name, { type: decl.varType, value: val });
        }
      }
    } catch (err) {
      const rErr =
        err instanceof FirmwareRuntimeError
          ? err
          : new FirmwareRuntimeError(String(err), files[0].path, 1);
      this.lastError = {
        id: "build_init_err",
        severity: "error",
        category: "runtime",
        file: rErr.file,
        line: rErr.line,
        column: 1,
        message: rErr.message,
      };
      this.state = "ERROR";
      return { ok: false, diagnostics: [this.lastError] };
    }

    this.state = "BUILT";
    this.logEvent(
      "lifecycle",
      `Execution plan built (${this.functions.size} functions, ${parsed.declarations.length} top-level AST nodes). Note: Safe AST interpreter plan — not native Xtensa C++ compilation.`
    );
    this.onStateUpdate?.();
    return { ok: true, diagnostics: parsed.diagnostics };
  }

  public start(): void {
    if (this.state !== "BUILT" && this.state !== "STOPPED" && this.state !== "PAUSED") {
      return;
    }
    if (this.state === "PAUSED") {
      this.state = "RUNNING";
      this.logEvent("lifecycle", "Simulation resumed.");
      this.onStateUpdate?.();
      return;
    }
    this.wakeAtSimMs = 0;
    this.generator = this.mainLifecycleGenerator();
    this.state = "RUNNING";
    this.markModuleActive("esp32_mcu");
    this.logEvent("lifecycle", "Simulation started: entering setup().");
    this.onStateUpdate?.();
  }

  public pause(): void {
    if (this.state === "RUNNING") {
      this.state = "PAUSED";
      virtualAudio.stopAll();
      this.logEvent("lifecycle", `Simulation paused at ${Math.round(this.simTimeMs)}ms.`);
      this.onStateUpdate?.();
    }
  }

  public resume(): void {
    if (this.state === "PAUSED") {
      this.state = "RUNNING";
      this.logEvent("lifecycle", "Simulation resumed.");
      this.onStateUpdate?.();
    }
  }

  public stop(): void {
    this.generator = null;
    virtualAudio.stopAll();
    this.audioState.buzzerActive = false;
    this.audioState.speakerActive = false;
    if (this.state === "RUNNING" || this.state === "PAUSED") {
      this.state = "STOPPED";
      this.logEvent("lifecycle", "Simulation stopped.");
    }
    this.onStateUpdate?.();
  }

  public reset(): void {
    this.generator = null;
    virtualAudio.stopAll();
    this.oled.reset();
    this.initPins();
    this.serialLineBuf = "";
    this.serialRxQueue = [];
    this.activeModulesSet.clear();
    this.warnedUnsupportedApis.clear();
    this.nvsStorage = {};
    this.servos = {};
    this.wifiMock = { connected: false, ssid: "", ip: "0.0.0.0", rssi: -52 };
    this.audioState.buzzerActive = false;
    this.audioState.buzzerFreqHz = 0;
    this.audioState.speakerActive = false;
    this.audioState.speakerFreqHz = 0;
    this.simTimeMs = 0;
    this.loopIterations = 0;
    this.instructionsExecuted = 0;
    this.lastError = null;
    this.state = "IDLE";
    this.logEvent("lifecycle", "Virtual hardware and OLED framebuffer reset to blank neutral state.");
    this.onStateUpdate?.();
  }

  /**
   * Advances simulation clock by deltaMs and executes up to maxInstructionsPerTick AST steps.
   */
  public step(deltaMs: number): void {
    if (this.state !== "RUNNING" || !this.generator) return;

    this.simTimeMs += Math.max(0, deltaMs);

    // Handle buzzer duration auto-stop
    if (
      this.audioState.buzzerActive &&
      this.audioState.buzzerStopAtMs > 0 &&
      this.simTimeMs >= this.audioState.buzzerStopAtMs
    ) {
      this.audioState.buzzerActive = false;
      this.audioState.buzzerFreqHz = 0;
      this.audioState.buzzerStopAtMs = 0;
      virtualAudio.stopBuzzer();
    }

    if (this.simTimeMs < this.wakeAtSimMs) {
      return;
    }

    this.tickInstructions = 0;
    try {
      while (this.tickInstructions < this.maxInstructionsPerTick) {
        const res = this.generator.next();
        if (res.done) {
          this.state = "STOPPED";
          this.logEvent("lifecycle", "Firmware execution completed.");
          break;
        }
        const sig = res.value;
        if (sig.type === "delay") {
          this.wakeAtSimMs = this.simTimeMs + Math.max(0, sig.delayMs ?? 0);
          break;
        }
        if (sig.type === "halt") {
          this.state = "STOPPED";
          virtualAudio.stopAll();
          break;
        }
        if (sig.type === "slice") {
          break;
        }
      }
    } catch (err) {
      virtualAudio.stopAll();
      const rErr =
        err instanceof FirmwareRuntimeError
          ? err
          : new FirmwareRuntimeError(err instanceof Error ? err.message : String(err), "", 1);
      this.lastError = {
        id: `rt_err_${Date.now()}`,
        severity: "error",
        category: "runtime",
        file: rErr.file,
        line: rErr.line,
        column: 1,
        message: rErr.message,
      };
      this.state = "ERROR";
      this.logEvent("error", `Runtime error at ${rErr.file}:${rErr.line}: ${rErr.message}`, rErr.file, rErr.line);
      this.pushSerial("error", `[RUNTIME ERROR] ${rErr.file}:${rErr.line} — ${rErr.message}`);
    }
    this.onStateUpdate?.();
  }

  public getSnapshot(): RuntimeSnapshot {
    const vars: Record<string, { type: string; value: string }> = {};
    for (const [k, entry] of this.globalEnv.vars.entries()) {
      if (k in ARDUINO_CONSTANTS) continue;
      if (["Serial", "Wire", "SPI", "EEPROM", "WiFi", "ESP"].includes(k)) continue;
      if (k.includes("::")) continue;
      vars[k] = { type: entry.type, value: formatVarPreview(entry.value) };
    }

    return {
      state: this.state,
      simTimeMs: Math.round(this.simTimeMs),
      loopIterations: this.loopIterations,
      instructionsExecuted: this.instructionsExecuted,
      activeModules: Array.from(this.activeModulesSet),
      pins: { ...this.pins },
      variables: vars,
      oledFrameCount: this.oled.frameCount,
      oledActivePixels: this.oled.getActivePixelCount(),
      oledInverted: this.oled.inverted,
      oledDimmed: this.oled.dimmed,
      oledInitialized: this.oled.initialized,
      audioState: {
        buzzerActive: this.audioState.buzzerActive,
        buzzerFreqHz: this.audioState.buzzerFreqHz,
        speakerActive: this.audioState.speakerActive,
        speakerFreqHz: this.audioState.speakerFreqHz,
        micLevel: this.audioState.micLevel,
      },
      nvsStorage: JSON.parse(JSON.stringify(this.nvsStorage)),
      servos: { ...this.servos },
      imu: { ...this.imu },
      wifiMock: { ...this.wifiMock },
      lastError: this.lastError,
    };
  }

  private evalMacroValue(raw: string): RuntimeValue {
    const t = raw.trim();
    if (t === "true") return true;
    if (t === "false") return false;
    if (t in ARDUINO_CONSTANTS) return ARDUINO_CONSTANTS[t];
    if (this.globalEnv.vars.has(t)) return this.globalEnv.vars.get(t)!.value;
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
    const cleaned = t.replace(/[uUlLfF]+$/, "");
    if (/^-?0x[0-9a-fA-F]+$/.test(cleaned)) return parseInt(cleaned, 16);
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
    // Simple arithmetic macro e.g. `(128 * 64)`
    const stripped = cleaned.replace(/[()]/g, "").trim();
    const binMatch = stripped.match(/^(-?\d+)\s*([+\-*/])\s*(-?\d+)$/);
    if (binMatch) {
      const a = Number(binMatch[1]);
      const b = Number(binMatch[3]);
      if (binMatch[2] === "+") return a + b;
      if (binMatch[2] === "-") return a - b;
      if (binMatch[2] === "*") return a * b;
      if (binMatch[2] === "/" && b !== 0) return a / b;
    }
    return t;
  }

  private evalSyncConst(expr: Expression): RuntimeValue {
    const gen = this.evalExpr(expr, this.globalEnv);
    let stepCount = 0;
    while (stepCount < 5000) {
      const r = gen.next();
      if (r.done) return r.value;
      stepCount++;
    }
    return 0;
  }

  private initVarSync(decl: VarDecl, env: EnvFrame): RuntimeValue {
    if (decl.constructorArgs !== null) {
      const args = decl.constructorArgs.map((a) => this.evalSyncConst(a));
      return this.constructObject(decl.varType, args);
    }
    if (decl.isArray) {
      if (decl.initializer && decl.initializer.kind === "ArrayInit") {
        return {
          __kind: "array",
          elements: decl.initializer.elements.map((e) => this.evalSyncConst(e)),
        };
      }
      const lenExpr = decl.arrayDimensions[0];
      const len = lenExpr ? Math.max(0, Math.min(4096, Math.trunc(toNumber(this.evalSyncConst(lenExpr))))) : 0;
      return {
        __kind: "array",
        elements: new Array(len).fill(0),
      };
    }
    if (decl.initializer) {
      return this.evalSyncConst(decl.initializer);
    }
    if (this.structs.has(decl.varType) || ["Adafruit_SSD1306", "Preferences", "Servo", "MPU6050", "BluetoothSerial"].includes(decl.varType)) {
      return this.constructObject(decl.varType, []);
    }
    if (decl.varType === "String") return "";
    if (decl.varType === "bool" || decl.varType === "boolean") return false;
    return 0;
  }

  private constructObject(className: string, _args: RuntimeValue[]): ObjectValue {
    const fields: Record<string, RuntimeValue> = {};
    if (className === "Preferences") {
      fields.__namespace = "default";
      fields.__open = false;
    } else if (className === "Servo") {
      fields.__pin = -1;
      fields.__angle = 90;
    } else if (this.structs.has(className)) {
      const def = this.structs.get(className)!;
      for (const f of def.fields) {
        fields[f.name] = f.initializer ? this.evalSyncConst(f.initializer) : f.varType === "String" ? "" : 0;
      }
    }
    return { __kind: "object", className, fields };
  }

  private *mainLifecycleGenerator(): Generator<ExecYield, void, void> {
    const setupFn = this.functions.get("setup");
    const loopFn = this.functions.get("loop");

    if (setupFn && setupFn.body) {
      yield* this.callUserFunction(setupFn, [], null);
    }

    while (true) {
      this.delayedInCurrentLoop = false;
      if (loopFn && loopFn.body) {
        yield* this.callUserFunction(loopFn, [], null);
      }
      this.loopIterations++;
      // If loop() did not already yield via delay(), yield one frame slice so tight loops stay responsive
      if (!this.delayedInCurrentLoop) {
        yield { type: "slice" };
      }
    }
  }

  private lookupVar(name: string, env: EnvFrame): { type: string; value: RuntimeValue } | null {
    let cur: EnvFrame | null = env;
    while (cur) {
      if (cur.vars.has(name)) return cur.vars.get(name)!;
      cur = cur.parent;
    }
    return null;
  }

  private *tickGuard(): Generator<ExecYield, void, void> {
    this.instructionsExecuted++;
    this.tickInstructions++;
    if (this.tickInstructions >= this.maxInstructionsPerTick) {
      yield { type: "slice" };
    }
  }

  private *callUserFunction(
    fn: FunctionDecl,
    args: RuntimeValue[],
    thisObj: ObjectValue | null
  ): Generator<ExecYield, RuntimeValue, void> {
    if (this.callDepth >= this.maxCallStackDepth) {
      throw new FirmwareRuntimeError(
        `Maximum call stack depth (${this.maxCallStackDepth}) exceeded in '${fn.name}()'`,
        fn.file,
        fn.line
      );
    }
    this.callDepth++;
    const frame: EnvFrame = { vars: new Map(), parent: this.globalEnv };
    if (thisObj) {
      frame.vars.set("this", { type: thisObj.className, value: thisObj });
      for (const [k, v] of Object.entries(thisObj.fields)) {
        frame.vars.set(k, { type: "field", value: v });
      }
    }
    for (let i = 0; i < fn.params.length; i++) {
      const p = fn.params[i];
      let val = i < args.length ? args[i] : null;
      if (val === null && p.defaultValue) {
        val = yield* this.evalExpr(p.defaultValue, frame);
      }
      frame.vars.set(p.name, { type: p.paramType, value: val ?? 0 });
    }
    try {
      if (fn.body) {
        yield* this.execBlock(fn.body, frame);
      }
      if (thisObj) {
        for (const k of Object.keys(thisObj.fields)) {
          const updated = frame.vars.get(k);
          if (updated) thisObj.fields[k] = updated.value;
        }
      }
      return null;
    } catch (sig) {
      if (sig instanceof ControlSignal && sig.kind === "return") {
        if (thisObj) {
          for (const k of Object.keys(thisObj.fields)) {
            const updated = frame.vars.get(k);
            if (updated) thisObj.fields[k] = updated.value;
          }
        }
        return sig.value;
      }
      throw sig;
    } finally {
      this.callDepth--;
    }
  }

  private *execBlock(block: BlockStmt, parentEnv: EnvFrame): Generator<ExecYield, void, void> {
    const env: EnvFrame = { vars: new Map(), parent: parentEnv };
    for (const stmt of block.statements) {
      yield* this.execStmt(stmt, env);
    }
  }

  private *execStmt(stmt: Statement, env: EnvFrame): Generator<ExecYield, void, void> {
    yield* this.tickGuard();
    switch (stmt.kind) {
      case "EmptyStmt":
      case "UnsupportedNode":
        return;

      case "BlockStmt":
        yield* this.execBlock(stmt, env);
        return;

      case "VarDecl": {
        const staticKey = `${stmt.file}:${stmt.line}:${stmt.name}`;
        if (stmt.isStatic && this.staticLocals.has(staticKey)) {
          env.vars.set(stmt.name, { type: stmt.varType, value: this.staticLocals.get(staticKey)! });
          return;
        }
        let val: RuntimeValue;
        if (stmt.initializer) {
          val = yield* this.evalExpr(stmt.initializer, env);
        } else if (stmt.constructorArgs !== null) {
          const cArgs: RuntimeValue[] = [];
          for (const a of stmt.constructorArgs) cArgs.push(yield* this.evalExpr(a, env));
          val = this.constructObject(stmt.varType, cArgs);
        } else if (stmt.isArray) {
          const lenExpr = stmt.arrayDimensions[0];
          const len = lenExpr ? Math.max(0, Math.min(4096, Math.trunc(toNumber(yield* this.evalExpr(lenExpr, env))))) : 0;
          val = { __kind: "array", elements: new Array(len).fill(0) };
        } else {
          val = stmt.varType === "String" ? "" : stmt.varType === "bool" || stmt.varType === "boolean" ? false : 0;
        }
        if (stmt.isStatic) this.staticLocals.set(staticKey, val);
        env.vars.set(stmt.name, { type: stmt.varType, value: val });
        return;
      }

      case "ExprStmt":
        yield* this.evalExpr(stmt.expression, env);
        return;

      case "IfStmt": {
        const cond = yield* this.evalExpr(stmt.condition, env);
        if (toBool(cond)) {
          yield* this.execStmt(stmt.thenBranch, env);
        } else if (stmt.elseBranch) {
          yield* this.execStmt(stmt.elseBranch, env);
        }
        return;
      }

      case "WhileStmt": {
        while (toBool(yield* this.evalExpr(stmt.condition, env))) {
          yield* this.tickGuard();
          try {
            yield* this.execStmt(stmt.body, env);
          } catch (sig) {
            if (sig instanceof ControlSignal) {
              if (sig.kind === "break") break;
              if (sig.kind === "continue") continue;
            }
            throw sig;
          }
        }
        return;
      }

      case "DoWhileStmt": {
        do {
          yield* this.tickGuard();
          try {
            yield* this.execStmt(stmt.body, env);
          } catch (sig) {
            if (sig instanceof ControlSignal) {
              if (sig.kind === "break") break;
              if (sig.kind === "continue") continue;
            }
            throw sig;
          }
        } while (toBool(yield* this.evalExpr(stmt.condition, env)));
        return;
      }

      case "ForStmt": {
        const loopEnv: EnvFrame = { vars: new Map(), parent: env };
        if (stmt.init) yield* this.execStmt(stmt.init, loopEnv);
        while (true) {
          yield* this.tickGuard();
          if (stmt.condition) {
            const c = yield* this.evalExpr(stmt.condition, loopEnv);
            if (!toBool(c)) break;
          }
          try {
            yield* this.execStmt(stmt.body, loopEnv);
          } catch (sig) {
            if (sig instanceof ControlSignal) {
              if (sig.kind === "break") break;
              if (sig.kind === "continue") {
                if (stmt.update) yield* this.evalExpr(stmt.update, loopEnv);
                continue;
              }
            }
            throw sig;
          }
          if (stmt.update) yield* this.evalExpr(stmt.update, loopEnv);
        }
        return;
      }

      case "SwitchStmt": {
        const disc = yield* this.evalExpr(stmt.discriminant, env);
        let matched = false;
        let defaultIdx = -1;
        for (let i = 0; i < stmt.cases.length; i++) {
          const c = stmt.cases[i];
          if (c.test === null) {
            defaultIdx = i;
            continue;
          }
          const testVal = yield* this.evalExpr(c.test, env);
          if (testVal === disc || toNumber(testVal) === toNumber(disc)) {
            matched = true;
            try {
              for (let j = i; j < stmt.cases.length; j++) {
                for (const s of stmt.cases[j].consequent) {
                  yield* this.execStmt(s, env);
                }
              }
            } catch (sig) {
              if (sig instanceof ControlSignal && sig.kind === "break") return;
              throw sig;
            }
            return;
          }
        }
        if (!matched && defaultIdx !== -1) {
          try {
            for (let j = defaultIdx; j < stmt.cases.length; j++) {
              for (const s of stmt.cases[j].consequent) {
                yield* this.execStmt(s, env);
              }
            }
          } catch (sig) {
            if (sig instanceof ControlSignal && sig.kind === "break") return;
            throw sig;
          }
        }
        return;
      }

      case "ReturnStmt": {
        const val = stmt.argument ? yield* this.evalExpr(stmt.argument, env) : null;
        throw new ControlSignal("return", val);
      }

      case "BreakStmt":
        throw new ControlSignal("break");

      case "ContinueStmt":
        throw new ControlSignal("continue");
    }
  }

  private *evalExpr(expr: Expression, env: EnvFrame): Generator<ExecYield, RuntimeValue, void> {
    yield* this.tickGuard();
    switch (expr.kind) {
      case "NumberLiteral":
        return expr.value;
      case "StringLiteral":
        return expr.value;
      case "CharLiteral":
        return expr.charCode;
      case "BoolLiteral":
        return expr.value;

      case "ArrayInit": {
        const elements: RuntimeValue[] = [];
        for (const el of expr.elements) {
          elements.push(yield* this.evalExpr(el, env));
        }
        return { __kind: "array", elements };
      }

      case "Identifier": {
        const found = this.lookupVar(expr.name, env);
        if (found) return found.value;
        // Function name reference (e.g. passed to attachInterrupt)
        if (this.functions.has(expr.name)) return expr.name;
        return 0;
      }

      case "SizeofExpr": {
        const found = this.lookupVar(expr.target, env);
        if (found && isArrayValue(found.value)) {
          return found.value.elements.length;
        }
        return 4;
      }

      case "CastExpr": {
        const v = yield* this.evalExpr(expr.operand, env);
        const t = expr.targetType.toLowerCase();
        if (t.includes("float") || t.includes("double")) return toNumber(v);
        if (t.includes("bool")) return toBool(v);
        if (t.includes("string")) return toDisplayString(v);
        if (t.includes("uint8") || t.includes("byte")) return Math.trunc(toNumber(v)) & 0xff;
        if (t.includes("int8")) return (Math.trunc(toNumber(v)) << 24) >> 24;
        if (t.includes("uint16")) return Math.trunc(toNumber(v)) & 0xffff;
        if (t.includes("int") || t.includes("long") || t.includes("short") || t.includes("char")) {
          return Math.trunc(toNumber(v));
        }
        return v;
      }

      case "UnaryExpr": {
        if (expr.operator === "++" || expr.operator === "--") {
          const delta = expr.operator === "++" ? 1 : -1;
          const oldVal = toNumber(yield* this.evalExpr(expr.operand, env));
          const newVal = oldVal + delta;
          yield* this.assignTarget(expr.operand, newVal, env);
          return expr.prefix ? newVal : oldVal;
        }
        if (expr.operator === "&" || expr.operator === "*") {
          return yield* this.evalExpr(expr.operand, env);
        }
        const val = yield* this.evalExpr(expr.operand, env);
        if (expr.operator === "-") return -toNumber(val);
        if (expr.operator === "+") return +toNumber(val);
        if (expr.operator === "!") return !toBool(val);
        if (expr.operator === "~") return ~Math.trunc(toNumber(val));
        return val;
      }

      case "BinaryExpr": {
        if (expr.operator === "&&") {
          const l = yield* this.evalExpr(expr.left, env);
          if (!toBool(l)) return false;
          return toBool(yield* this.evalExpr(expr.right, env));
        }
        if (expr.operator === "||") {
          const l = yield* this.evalExpr(expr.left, env);
          if (toBool(l)) return true;
          return toBool(yield* this.evalExpr(expr.right, env));
        }
        const left = yield* this.evalExpr(expr.left, env);
        const right = yield* this.evalExpr(expr.right, env);
        if (expr.operator === "+") {
          if (typeof left === "string" || typeof right === "string") {
            return toDisplayString(left) + toDisplayString(right);
          }
          return toNumber(left) + toNumber(right);
        }
        const ln = toNumber(left);
        const rn = toNumber(right);
        switch (expr.operator) {
          case "-":
            return ln - rn;
          case "*":
            return ln * rn;
          case "/":
            if (rn === 0) return 0;
            return Number.isInteger(ln) && Number.isInteger(rn) ? Math.trunc(ln / rn) : ln / rn;
          case "%":
            return rn === 0 ? 0 : ln % rn;
          case "&":
            return Math.trunc(ln) & Math.trunc(rn);
          case "|":
            return Math.trunc(ln) | Math.trunc(rn);
          case "^":
            return Math.trunc(ln) ^ Math.trunc(rn);
          case "<<":
            return Math.trunc(ln) << Math.trunc(rn);
          case ">>":
            return Math.trunc(ln) >> Math.trunc(rn);
          case "==":
            return typeof left === "string" && typeof right === "string" ? left === right : ln === rn;
          case "!=":
            return typeof left === "string" && typeof right === "string" ? left !== right : ln !== rn;
          case "<":
            return ln < rn;
          case "<=":
            return ln <= rn;
          case ">":
            return ln > rn;
          case ">=":
            return ln >= rn;
          default:
            return 0;
        }
      }

      case "TernaryExpr": {
        const c = yield* this.evalExpr(expr.condition, env);
        return toBool(c)
          ? yield* this.evalExpr(expr.consequent, env)
          : yield* this.evalExpr(expr.alternate, env);
      }

      case "AssignExpr": {
        const rhs = yield* this.evalExpr(expr.right, env);
        if (expr.operator === "=") {
          yield* this.assignTarget(expr.left, rhs, env);
          return rhs;
        }
        const cur = yield* this.evalExpr(expr.left, env);
        let next: RuntimeValue;
        if (expr.operator === "+=" && (typeof cur === "string" || typeof rhs === "string")) {
          next = toDisplayString(cur) + toDisplayString(rhs);
        } else {
          const a = toNumber(cur);
          const b = toNumber(rhs);
          switch (expr.operator) {
            case "+=":
              next = a + b;
              break;
            case "-=":
              next = a - b;
              break;
            case "*=":
              next = a * b;
              break;
            case "/=":
              next = b === 0 ? 0 : a / b;
              break;
            case "%=":
              next = b === 0 ? 0 : a % b;
              break;
            case "&=":
              next = Math.trunc(a) & Math.trunc(b);
              break;
            case "|=":
              next = Math.trunc(a) | Math.trunc(b);
              break;
            case "^=":
              next = Math.trunc(a) ^ Math.trunc(b);
              break;
            case "<<=":
              next = Math.trunc(a) << Math.trunc(b);
              break;
            case ">>=":
              next = Math.trunc(a) >> Math.trunc(b);
              break;
            default:
              next = rhs;
          }
        }
        yield* this.assignTarget(expr.left, next, env);
        return next;
      }

      case "IndexExpr": {
        const obj = yield* this.evalExpr(expr.object, env);
        const idx = Math.trunc(toNumber(yield* this.evalExpr(expr.index, env)));
        if (isArrayValue(obj)) {
          return obj.elements[idx] ?? 0;
        }
        if (typeof obj === "string") {
          return idx >= 0 && idx < obj.length ? obj.charCodeAt(idx) : 0;
        }
        return 0;
      }

      case "MemberExpr": {
        const obj = yield* this.evalExpr(expr.object, env);
        if (isObjectValue(obj)) {
          return obj.fields[expr.property] ?? 0;
        }
        return 0;
      }

      case "CallExpr": {
        // Evaluate arguments
        const args: RuntimeValue[] = [];
        for (const a of expr.args) {
          args.push(yield* this.evalExpr(a, env));
        }

        // Method call: `obj.method(...)`
        if (expr.callee.kind === "MemberExpr") {
          const obj = yield* this.evalExpr(expr.callee.object, env);
          return yield* this.callMethod(obj, expr.callee.property, args, expr.file, expr.line);
        }

        // Direct function call: `fn(...)`
        if (expr.callee.kind === "Identifier") {
          const fnName = expr.callee.name;
          // User-defined function
          const userFn = this.functions.get(fnName);
          if (userFn && userFn.body) {
            return yield* this.callUserFunction(userFn, args, null);
          }
          // Built-in Arduino / HAL function
          return yield* this.callBuiltinFunction(fnName, args, expr.file, expr.line);
        }
        return 0;
      }
    }
  }

  private *assignTarget(
    target: Expression,
    value: RuntimeValue,
    env: EnvFrame
  ): Generator<ExecYield, void, void> {
    if (target.kind === "Identifier") {
      let cur: EnvFrame | null = env;
      while (cur) {
        if (cur.vars.has(target.name)) {
          const entry = cur.vars.get(target.name)!;
          entry.value = value;
          // Persist static locals if matching
          return;
        }
        cur = cur.parent;
      }
      env.vars.set(target.name, { type: "auto", value });
      return;
    }
    if (target.kind === "IndexExpr") {
      const arr = yield* this.evalExpr(target.object, env);
      const idx = Math.trunc(toNumber(yield* this.evalExpr(target.index, env)));
      if (isArrayValue(arr) && idx >= 0 && idx < 8192) {
        arr.elements[idx] = value;
      }
      return;
    }
    if (target.kind === "MemberExpr") {
      const obj = yield* this.evalExpr(target.object, env);
      if (isObjectValue(obj)) {
        obj.fields[target.property] = value;
      }
    }
  }

  private *callBuiltinFunction(
    name: string,
    args: RuntimeValue[],
    file: string,
    line: number
  ): Generator<ExecYield, RuntimeValue, void> {
    switch (name) {
      // Flash string helper F("...")
      case "F":
        return args[0] ?? "";
      case "String":
        return toDisplayString(args[0] ?? "");
      case "int":
      case "long":
      case "uint8_t":
      case "uint16_t":
      case "uint32_t":
      case "byte":
        return Math.trunc(toNumber(args[0] ?? 0));
      case "float":
      case "double":
        return toNumber(args[0] ?? 0);

      // Timers
      case "millis":
        this.markModuleActive("timers_core");
        return Math.floor(this.simTimeMs);
      case "micros":
      case "esp_timer_get_time":
        this.markModuleActive("timers_core");
        return Math.floor(this.simTimeMs * 1000);
      case "delay": {
        this.markModuleActive("timers_core");
        const ms = Math.max(0, toNumber(args[0] ?? 0));
        if (ms > 0) {
          this.delayedInCurrentLoop = true;
          yield { type: "delay", delayMs: ms };
        }
        return null;
      }
      case "delayMicroseconds": {
        this.markModuleActive("timers_core");
        const us = Math.max(0, toNumber(args[0] ?? 0));
        if (us >= 500) {
          yield { type: "delay", delayMs: us / 1000 };
        }
        return null;
      }

      // GPIO
      case "pinMode": {
        this.markModuleActive("gpio_core");
        const p = Math.trunc(toNumber(args[0] ?? 0));
        const m = Math.trunc(toNumber(args[1] ?? 0));
        const pin = this.pins[p];
        if (pin) {
          if (m === 0) pin.mode = "INPUT";
          else if (m === 1) pin.mode = "OUTPUT";
          else if (m === 2) {
            pin.mode = "INPUT_PULLUP";
            pin.digitalValue = 1;
            this.markModuleActive("buttons_digital");
          } else if (m === 3) {
            pin.mode = "INPUT_PULLDOWN";
            pin.digitalValue = 0;
            this.markModuleActive("buttons_digital");
          }
        }
        return null;
      }
      case "digitalWrite": {
        this.markModuleActive("gpio_core");
        const p = Math.trunc(toNumber(args[0] ?? 0));
        const v: 0 | 1 = toNumber(args[1] ?? 0) ? 1 : 0;
        const pin = this.pins[p];
        if (pin) {
          pin.digitalValue = v;
          if (p === 2) this.markModuleActive("leds_pwm");
        }
        return null;
      }
      case "digitalRead": {
        this.markModuleActive("gpio_core");
        const p = Math.trunc(toNumber(args[0] ?? 0));
        if (p === this.hardwareConfig.touch.mainTouchPin || p === this.hardwareConfig.touch.wakeTouchPin) {
          this.markModuleActive("touch_capacitive");
        }
        return this.pins[p]?.digitalValue ?? 0;
      }
      case "analogRead": {
        this.markModuleActive("gpio_core");
        const p = Math.trunc(toNumber(args[0] ?? 0));
        if (p === this.hardwareConfig.battery.adcPin) {
          this.updateBatteryAdcPin();
        }
        return this.pins[p]?.analogValue ?? 0;
      }
      case "analogWrite": {
        this.markModuleActive("gpio_core");
        const p = Math.trunc(toNumber(args[0] ?? 0));
        const v = Math.max(0, Math.min(255, Math.trunc(toNumber(args[1] ?? 0))));
        if (this.pins[p]) {
          this.pins[p].pwmValue = v;
          this.pins[p].digitalValue = v > 0 ? 1 : 0;
          this.markModuleActive("leds_pwm");
        }
        return null;
      }

      // Touch
      case "touchRead": {
        this.markModuleActive("touch_capacitive");
        const p = Math.trunc(toNumber(args[0] ?? 0));
        return this.pins[p]?.touchValue ?? 74;
      }

      // Audio Buzzer
      case "tone": {
        if (!this.isModuleEnabled("audio_buzzer")) {
          this.warnUnsupported("tone", "audio_buzzer", file, line);
          return null;
        }
        this.markModuleActive("audio_buzzer");
        const freq = Math.trunc(toNumber(args[1] ?? 0));
        const dur = args.length >= 3 ? Math.trunc(toNumber(args[2] ?? 0)) : 0;
        this.audioState.buzzerActive = freq > 0;
        this.audioState.buzzerFreqHz = freq;
        this.audioState.buzzerStopAtMs = dur > 0 ? this.simTimeMs + dur : 0;
        virtualAudio.playBuzzer(freq, dur > 0 ? dur : undefined);
        this.logEvent("audio", `Buzzer tone(${freq}Hz${dur ? `, ${dur}ms` : ""})`);
        return null;
      }
      case "noTone": {
        if (!this.isModuleEnabled("audio_buzzer")) {
          this.warnUnsupported("noTone", "audio_buzzer", file, line);
          return null;
        }
        this.audioState.buzzerActive = false;
        this.audioState.buzzerFreqHz = 0;
        this.audioState.buzzerStopAtMs = 0;
        virtualAudio.stopBuzzer();
        return null;
      }

      // Extensible: Speaker LEDC / DAC
      case "ledcSetup": {
        if (!this.isModuleEnabled("audio_speaker")) {
          this.warnUnsupported("ledcSetup", "audio_speaker", file, line);
          return 0;
        }
        this.markModuleActive("audio_speaker");
        const ch = Math.trunc(toNumber(args[0] ?? 0));
        const freq = toNumber(args[1] ?? 1000);
        this.ledcChannels.set(ch, { pin: -1, freq, duty: 0 });
        return freq;
      }
      case "ledcAttachPin": {
        if (!this.isModuleEnabled("audio_speaker")) {
          this.warnUnsupported("ledcAttachPin", "audio_speaker", file, line);
          return null;
        }
        this.markModuleActive("audio_speaker");
        const pin = Math.trunc(toNumber(args[0] ?? 0));
        const ch = Math.trunc(toNumber(args[1] ?? 0));
        const cur = this.ledcChannels.get(ch) ?? { pin, freq: 1000, duty: 0 };
        cur.pin = pin;
        this.ledcChannels.set(ch, cur);
        return null;
      }
      case "ledcWriteTone": {
        if (!this.isModuleEnabled("audio_speaker")) {
          this.warnUnsupported("ledcWriteTone", "audio_speaker", file, line);
          return 0;
        }
        this.markModuleActive("audio_speaker");
        const ch = Math.trunc(toNumber(args[0] ?? 0));
        const freq = toNumber(args[1] ?? 0);
        const entry = this.ledcChannels.get(ch);
        if (entry) entry.freq = freq;
        if (freq > 0) {
          this.audioState.speakerActive = true;
          this.audioState.speakerFreqHz = Math.round(freq);
          virtualAudio.playSpeaker(freq);
        } else {
          this.audioState.speakerActive = false;
          this.audioState.speakerFreqHz = 0;
          virtualAudio.stopSpeaker();
        }
        return freq;
      }
      case "ledcWrite": {
        if (!this.isModuleEnabled("audio_speaker")) {
          this.warnUnsupported("ledcWrite", "audio_speaker", file, line);
          return null;
        }
        this.markModuleActive("audio_speaker");
        const ch = Math.trunc(toNumber(args[0] ?? 0));
        const duty = Math.trunc(toNumber(args[1] ?? 0));
        const entry = this.ledcChannels.get(ch);
        if (entry) {
          entry.duty = duty;
          if (entry.pin >= 0 && this.pins[entry.pin]) {
            this.pins[entry.pin].pwmValue = Math.max(0, Math.min(255, duty));
          }
        }
        return null;
      }
      case "dacWrite": {
        if (!this.isModuleEnabled("audio_speaker")) {
          this.warnUnsupported("dacWrite", "audio_speaker", file, line);
          return null;
        }
        this.markModuleActive("audio_speaker");
        const pin = Math.trunc(toNumber(args[0] ?? 26));
        const val = Math.max(0, Math.min(255, Math.trunc(toNumber(args[1] ?? 0))));
        if (this.pins[pin]) this.pins[pin].pwmValue = val;
        return null;
      }

      // Extensible: Battery ADC
      case "analogReadMilliVolts": {
        if (!this.isModuleEnabled("battery_adc")) {
          this.warnUnsupported("analogReadMilliVolts", "battery_adc", file, line);
          return 0;
        }
        this.markModuleActive("battery_adc");
        const p = Math.trunc(toNumber(args[0] ?? 35));
        if (p === this.hardwareConfig.battery.adcPin) {
          this.updateBatteryAdcPin();
        }
        const raw = this.pins[p]?.analogValue ?? 0;
        return Math.round((raw / 4095) * 3300);
      }
      case "analogSetAttenuation":
      case "analogReadResolution": {
        if (!this.isModuleEnabled("battery_adc")) {
          this.warnUnsupported(name, "battery_adc", file, line);
          return null;
        }
        this.markModuleActive("battery_adc");
        return null;
      }

      // Extensible (Partial): Microphone
      case "i2s_driver_install":
      case "i2s_set_pin": {
        if (!this.isModuleEnabled("microphone_i2s")) {
          this.warnUnsupported(name, "microphone_i2s", file, line);
          return -1;
        }
        this.markModuleActive("microphone_i2s");
        this.logEvent("audio", `${name}() [PARTIAL SIMULATION: virtual amplitude source only, not ESP32 I2S DMA]`);
        return 0;
      }
      case "i2s_read":
      case "micRead": {
        if (!this.isModuleEnabled("microphone_i2s")) {
          this.warnUnsupported(name, "microphone_i2s", file, line);
          return 0;
        }
        this.markModuleActive("microphone_i2s");
        return this.audioState.micLevel;
      }

      // Extensible (Partial): Interrupts & FreeRTOS
      case "digitalPinToInterrupt":
        return Math.trunc(toNumber(args[0] ?? 0));
      case "attachInterrupt": {
        if (!this.isModuleEnabled("rtos_interrupts")) {
          this.warnUnsupported("attachInterrupt", "rtos_interrupts", file, line);
          return null;
        }
        this.markModuleActive("rtos_interrupts");
        const pin = Math.trunc(toNumber(args[0] ?? 0));
        const fnName = typeof args[1] === "string" ? args[1] : "";
        const mode = Math.trunc(toNumber(args[2] ?? 1));
        if (fnName) this.interrupts.set(pin, { mode, fnName });
        return null;
      }
      case "detachInterrupt": {
        const pin = Math.trunc(toNumber(args[0] ?? 0));
        this.interrupts.delete(pin);
        return null;
      }
      case "vTaskDelay": {
        if (!this.isModuleEnabled("rtos_interrupts")) {
          this.warnUnsupported("vTaskDelay", "rtos_interrupts", file, line);
          return null;
        }
        this.markModuleActive("rtos_interrupts");
        const ticks = Math.max(0, toNumber(args[0] ?? 0));
        if (ticks > 0) yield { type: "delay", delayMs: ticks };
        return null;
      }
      case "xTaskCreate":
      case "xTaskCreatePinnedToCore": {
        this.warnUnsupported(name, "rtos_interrupts", file, line);
        return 0;
      }
      case "esp_deep_sleep_start": {
        if (!this.isModuleEnabled("rtos_interrupts")) {
          this.warnUnsupported("esp_deep_sleep_start", "rtos_interrupts", file, line);
          return null;
        }
        this.markModuleActive("rtos_interrupts");
        this.logEvent("lifecycle", "esp_deep_sleep_start() called — halting virtual execution loop (simulated sleep).");
        yield { type: "halt" };
        return null;
      }

      // Math & Random
      case "randomSeed": {
        this.rngState = Math.trunc(toNumber(args[0] ?? 1)) || 1337;
        return null;
      }
      case "random": {
        // Mulberry32 deterministic PRNG
        this.rngState = (this.rngState + 0x6d2b79f5) | 0;
        let t = Math.imul(this.rngState ^ (this.rngState >>> 15), 1 | this.rngState);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        if (args.length === 1) {
          const max = Math.max(1, Math.trunc(toNumber(args[0])));
          return Math.floor(r * max);
        }
        if (args.length >= 2) {
          const min = Math.trunc(toNumber(args[0]));
          const max = Math.trunc(toNumber(args[1]));
          return min + Math.floor(r * Math.max(1, max - min));
        }
        return Math.floor(r * 100);
      }
      case "map": {
        const x = toNumber(args[0] ?? 0);
        const inMin = toNumber(args[1] ?? 0);
        const inMax = toNumber(args[2] ?? 1);
        const outMin = toNumber(args[3] ?? 0);
        const outMax = toNumber(args[4] ?? 1);
        if (inMax === inMin) return outMin;
        return Math.trunc(((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
      }
      case "constrain": {
        const x = toNumber(args[0] ?? 0);
        const a = toNumber(args[1] ?? 0);
        const b = toNumber(args[2] ?? 0);
        return Math.max(a, Math.min(b, x));
      }
      case "min":
        return Math.min(toNumber(args[0] ?? 0), toNumber(args[1] ?? 0));
      case "max":
        return Math.max(toNumber(args[0] ?? 0), toNumber(args[1] ?? 0));
      case "abs":
      case "fabs":
        return Math.abs(toNumber(args[0] ?? 0));
      case "sin":
        return Math.sin(toNumber(args[0] ?? 0));
      case "cos":
        return Math.cos(toNumber(args[0] ?? 0));
      case "tan":
        return Math.tan(toNumber(args[0] ?? 0));
      case "sqrt":
        return Math.sqrt(Math.max(0, toNumber(args[0] ?? 0)));
      case "pow":
        return Math.pow(toNumber(args[0] ?? 0), toNumber(args[1] ?? 0));
      case "round":
        return Math.round(toNumber(args[0] ?? 0));
      case "floor":
        return Math.floor(toNumber(args[0] ?? 0));
      case "ceil":
        return Math.ceil(toNumber(args[0] ?? 0));
      case "bitRead":
        return (Math.trunc(toNumber(args[0] ?? 0)) >> Math.trunc(toNumber(args[1] ?? 0))) & 1;
      case "bitSet":
        return Math.trunc(toNumber(args[0] ?? 0)) | (1 << Math.trunc(toNumber(args[1] ?? 0)));
      case "bitClear":
        return Math.trunc(toNumber(args[0] ?? 0)) & ~(1 << Math.trunc(toNumber(args[1] ?? 0)));
      case "lowByte":
        return Math.trunc(toNumber(args[0] ?? 0)) & 0xff;
      case "highByte":
        return (Math.trunc(toNumber(args[0] ?? 0)) >> 8) & 0xff;
      default:
        this.logEvent("warning", `Unrecognized function '${name}()' called at ${file}:${line} — returning 0.`, file, line);
        return 0;
    }
  }

  private *callMethod(
    obj: RuntimeValue,
    method: string,
    args: RuntimeValue[],
    file: string,
    line: number
  ): Generator<ExecYield, RuntimeValue, void> {
    // Arduino String methods
    if (typeof obj === "string") {
      switch (method) {
        case "length":
          return obj.length;
        case "charAt":
          return obj.charCodeAt(Math.trunc(toNumber(args[0] ?? 0))) || 0;
        case "substring":
          return args.length >= 2
            ? obj.substring(Math.trunc(toNumber(args[0])), Math.trunc(toNumber(args[1])))
            : obj.substring(Math.trunc(toNumber(args[0] ?? 0)));
        case "indexOf":
          return obj.indexOf(toDisplayString(args[0] ?? ""));
        case "equals":
          return obj === toDisplayString(args[0] ?? "");
        case "toInt":
          return parseInt(obj, 10) || 0;
        case "toFloat":
          return parseFloat(obj) || 0;
        case "trim":
          return obj.trim();
        case "toUpperCase":
          return obj.toUpperCase();
        case "toLowerCase":
          return obj.toLowerCase();
        case "c_str":
          return obj;
        default:
          return 0;
      }
    }

    if (!isObjectValue(obj)) return 0;

    // 1. User-defined struct/class method
    const structDef = this.structs.get(obj.className);
    if (structDef) {
      const m = structDef.methods.find((fn) => fn.name === method && fn.body);
      if (m) {
        return yield* this.callUserFunction(m, args, obj);
      }
    }

    // 2. HardwareSerial (`Serial`)
    if (obj.className === "HardwareSerial") {
      this.markModuleActive("serial_uart");
      switch (method) {
        case "begin": {
          const baud = Math.trunc(toNumber(args[0] ?? 115200));
          this.pushSerial("system", `Serial.begin(${baud}) initialized`);
          return null;
        }
        case "print": {
          const txt = this.formatSerialArg(args[0], args[1]);
          this.serialLineBuf += txt;
          if (this.serialLineBuf.includes("\n")) {
            const parts = this.serialLineBuf.split("\n");
            this.serialLineBuf = parts.pop() ?? "";
            for (const p of parts) this.pushSerial("rx", p);
          }
          return txt.length;
        }
        case "println": {
          const txt = args.length > 0 ? this.formatSerialArg(args[0], args[1]) : "";
          this.pushSerial("rx", this.serialLineBuf + txt);
          this.serialLineBuf = "";
          return txt.length + 1;
        }
        case "printf": {
          let fmt = toDisplayString(args[0] ?? "");
          let idx = 1;
          fmt = fmt.replace(/%(\.\d+)?[dfsuxXci]/g, (spec) => {
            const val = args[idx++];
            if (spec.endsWith("x")) return Math.trunc(toNumber(val ?? 0)).toString(16);
            if (spec.endsWith("X")) return Math.trunc(toNumber(val ?? 0)).toString(16).toUpperCase();
            if (spec.endsWith("f")) return toNumber(val ?? 0).toFixed(2);
            return toDisplayString(val ?? "");
          });
          if (fmt.endsWith("\n")) {
            this.pushSerial("rx", this.serialLineBuf + fmt.slice(0, -1));
            this.serialLineBuf = "";
          } else {
            this.serialLineBuf += fmt;
          }
          return fmt.length;
        }
        case "write": {
          const ch = typeof args[0] === "number" ? String.fromCharCode(args[0]) : toDisplayString(args[0] ?? "");
          this.serialLineBuf += ch;
          return 1;
        }
        case "available":
          return this.serialRxQueue.length;
        case "read": {
          const ch = this.serialRxQueue.shift();
          return ch !== undefined ? ch.charCodeAt(0) : -1;
        }
        case "readString": {
          const s = this.serialRxQueue.join("");
          this.serialRxQueue = [];
          return s;
        }
        case "readStringUntil": {
          const delim = typeof args[0] === "number" ? String.fromCharCode(args[0]) : toDisplayString(args[0] ?? "\n");
          let out = "";
          while (this.serialRxQueue.length > 0) {
            const c = this.serialRxQueue.shift()!;
            if (c === delim) break;
            out += c;
          }
          return out;
        }
        case "flush":
          if (this.serialLineBuf) {
            this.pushSerial("rx", this.serialLineBuf);
            this.serialLineBuf = "";
          }
          return null;
      }
    }

    // 3. SSD1306 OLED (`Adafruit_SSD1306`)
    if (obj.className === "Adafruit_SSD1306") {
      this.markModuleActive("ssd1306_oled");
      switch (method) {
        case "begin": {
          const vcs = Math.trunc(toNumber(args[0] ?? 2));
          const defaultAddr = parseInt(this.hardwareConfig.oled.i2cAddress, 16) || 0x3c;
          const addr = Math.trunc(toNumber(args[1] ?? defaultAddr));
          const ok = this.oled.begin(vcs, addr);
          this.logEvent("oled", `SSD1306 OLED initialized (128x64 @ 0x${addr.toString(16).toUpperCase()})`);
          return ok;
        }
        case "clearDisplay":
          this.oled.clearDisplay();
          return null;
        case "display":
          this.oled.display();
          return null;
        case "drawPixel":
          this.oled.drawPixel(toNumber(args[0]), toNumber(args[1]), args.length >= 3 ? toNumber(args[2]) : SSD1306_WHITE);
          return null;
        case "drawLine":
          this.oled.drawLine(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            args.length >= 5 ? toNumber(args[4]) : SSD1306_WHITE
          );
          return null;
        case "drawFastHLine":
          this.oled.drawFastHLine(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            args.length >= 4 ? toNumber(args[3]) : SSD1306_WHITE
          );
          return null;
        case "drawFastVLine":
          this.oled.drawFastVLine(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            args.length >= 4 ? toNumber(args[3]) : SSD1306_WHITE
          );
          return null;
        case "drawRect":
          this.oled.drawRect(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            args.length >= 5 ? toNumber(args[4]) : SSD1306_WHITE
          );
          return null;
        case "fillRect":
          this.oled.fillRect(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            args.length >= 5 ? toNumber(args[4]) : SSD1306_WHITE
          );
          return null;
        case "drawRoundRect":
          this.oled.drawRoundRect(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            toNumber(args[4]),
            args.length >= 6 ? toNumber(args[5]) : SSD1306_WHITE
          );
          return null;
        case "fillRoundRect":
          this.oled.fillRoundRect(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            toNumber(args[4]),
            args.length >= 6 ? toNumber(args[5]) : SSD1306_WHITE
          );
          return null;
        case "drawCircle":
          this.oled.drawCircle(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            args.length >= 4 ? toNumber(args[3]) : SSD1306_WHITE
          );
          return null;
        case "fillCircle":
          this.oled.fillCircle(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            args.length >= 4 ? toNumber(args[3]) : SSD1306_WHITE
          );
          return null;
        case "drawTriangle":
          this.oled.drawTriangle(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            toNumber(args[4]),
            toNumber(args[5]),
            args.length >= 7 ? toNumber(args[6]) : SSD1306_WHITE
          );
          return null;
        case "fillTriangle":
          this.oled.fillTriangle(
            toNumber(args[0]),
            toNumber(args[1]),
            toNumber(args[2]),
            toNumber(args[3]),
            toNumber(args[4]),
            toNumber(args[5]),
            args.length >= 7 ? toNumber(args[6]) : SSD1306_WHITE
          );
          return null;
        case "drawBitmap": {
          const bmpArg = args[2];
          const bytes = isArrayValue(bmpArg) ? bmpArg.elements.map(toNumber) : [];
          this.oled.drawBitmap(
            toNumber(args[0]),
            toNumber(args[1]),
            bytes,
            toNumber(args[3]),
            toNumber(args[4]),
            args.length >= 6 ? toNumber(args[5]) : SSD1306_WHITE
          );
          return null;
        }
        case "setTextSize":
          this.oled.setTextSize(toNumber(args[0] ?? 1));
          return null;
        case "setTextColor":
          this.oled.setTextColor(
            toNumber(args[0] ?? SSD1306_WHITE),
            args.length >= 2 ? toNumber(args[1]) : -1
          );
          return null;
        case "setCursor":
          this.oled.setCursor(toNumber(args[0] ?? 0), toNumber(args[1] ?? 0));
          return null;
        case "setTextWrap":
          this.oled.textWrap = toBool(args[0] ?? true);
          return null;
        case "print":
          this.oled.print(this.formatSerialArg(args[0], args[1]));
          return null;
        case "println":
          this.oled.println(args.length > 0 ? this.formatSerialArg(args[0], args[1]) : "");
          return null;
        case "invertDisplay":
          this.oled.invertDisplay(toBool(args[0]));
          return null;
        case "dim":
          this.oled.dim(toBool(args[0]));
          return null;
        case "width":
          return this.oled.width;
        case "height":
          return this.oled.height;
        case "cp437":
          return null;
      }
    }

    // 4. I2C Wire Bus
    if (obj.className === "TwoWire") {
      this.markModuleActive("i2c_bus");
      switch (method) {
        case "begin": {
          const sda = args.length >= 2 ? Math.trunc(toNumber(args[0])) : this.hardwareConfig.oled.sdaPin;
          const scl = args.length >= 2 ? Math.trunc(toNumber(args[1])) : this.hardwareConfig.oled.sclPin;
          this.logEvent("bus", `Wire.begin(SDA=GPIO${sda}, SCL=GPIO${scl})`);
          return true;
        }
        case "setClock":
          return null;
        case "beginTransmission":
          this.i2cTargetAddr = Math.trunc(toNumber(args[0] ?? 0));
          return null;
        case "write":
          return 1;
        case "endTransmission": {
          const oledAddr = parseInt(this.hardwareConfig.oled.i2cAddress, 16) || 0x3c;
          if (this.hardwareConfig.oled.enabled && this.i2cTargetAddr === oledAddr) return 0; // ACK
          if (this.isModuleEnabled("imu_mpu6050") && this.i2cTargetAddr === 0x68) return 0;
          return 2; // NACK
        }
        case "requestFrom": {
          const count = Math.trunc(toNumber(args[1] ?? 0));
          this.i2cRxBuffer = new Array(Math.max(0, Math.min(64, count))).fill(0);
          return this.i2cRxBuffer.length;
        }
        case "available":
          return this.i2cRxBuffer.length;
        case "read":
          return this.i2cRxBuffer.shift() ?? 0;
      }
    }

    // 5. Extensible: Preferences / NVS
    if (obj.className === "Preferences") {
      if (!this.isModuleEnabled("preferences_nvs")) {
        this.warnUnsupported(`Preferences.${method}`, "preferences_nvs", file, line);
        return method.startsWith("get") ? args[1] ?? 0 : false;
      }
      this.markModuleActive("preferences_nvs");
      const nsName = String(obj.fields.__namespace || "default");
      const ensureNs = () => {
        if (!this.nvsStorage[nsName]) this.nvsStorage[nsName] = {};
        return this.nvsStorage[nsName];
      };
      switch (method) {
        case "begin": {
          const ns = toDisplayString(args[0] ?? "default");
          obj.fields.__namespace = ns;
          obj.fields.__open = true;
          if (!this.nvsStorage[ns]) this.nvsStorage[ns] = {};
          this.logEvent("storage", `Virtual NVS Preferences.begin("${ns}") [Simulated — not physical flash]`);
          return true;
        }
        case "end":
          obj.fields.__open = false;
          return null;
        case "clear":
          this.nvsStorage[nsName] = {};
          return true;
        case "remove":
          delete ensureNs()[toDisplayString(args[0] ?? "")];
          return true;
        case "putInt":
        case "putUInt":
        case "putLong":
        case "putULong":
        case "putFloat": {
          const k = toDisplayString(args[0] ?? "");
          const v = toNumber(args[1] ?? 0);
          ensureNs()[k] = v;
          return 4;
        }
        case "putBool": {
          const k = toDisplayString(args[0] ?? "");
          ensureNs()[k] = toBool(args[1]);
          return 1;
        }
        case "putString": {
          const k = toDisplayString(args[0] ?? "");
          const v = toDisplayString(args[1] ?? "");
          ensureNs()[k] = v;
          return v.length;
        }
        case "getInt":
        case "getUInt":
        case "getLong":
        case "getULong":
        case "getFloat": {
          const k = toDisplayString(args[0] ?? "");
          const stored = ensureNs()[k];
          return stored !== undefined ? toNumber(stored) : toNumber(args[1] ?? 0);
        }
        case "getBool": {
          const k = toDisplayString(args[0] ?? "");
          const stored = ensureNs()[k];
          return stored !== undefined ? toBool(stored) : toBool(args[1] ?? false);
        }
        case "getString": {
          const k = toDisplayString(args[0] ?? "");
          const stored = ensureNs()[k];
          return stored !== undefined ? String(stored) : toDisplayString(args[1] ?? "");
        }
      }
    }

    // 6. Extensible: EEPROM
    if (obj.className === "EEPROMClass") {
      if (!this.isModuleEnabled("preferences_nvs")) {
        this.warnUnsupported(`EEPROM.${method}`, "preferences_nvs", file, line);
        return 0;
      }
      this.markModuleActive("preferences_nvs");
      if (method === "begin") return true;
      if (method === "commit") return true;
      if (method === "read") return this.eepromBuffer[Math.trunc(toNumber(args[0])) & 511] ?? 0;
      if (method === "write") {
        this.eepromBuffer[Math.trunc(toNumber(args[0])) & 511] = Math.trunc(toNumber(args[1])) & 0xff;
        return null;
      }
    }

    // 7. Extensible: SPI
    if (obj.className === "SPIClass") {
      if (!this.isModuleEnabled("spi_bus")) {
        this.warnUnsupported(`SPI.${method}`, "spi_bus", file, line);
        return 0;
      }
      this.markModuleActive("spi_bus");
      if (method === "transfer") return Math.trunc(toNumber(args[0] ?? 0)) & 0xff;
      if (method === "transfer16") return Math.trunc(toNumber(args[0] ?? 0)) & 0xffff;
      return null;
    }

    // 8. Extensible: Servo
    if (obj.className === "Servo") {
      if (!this.isModuleEnabled("servo_pwm")) {
        this.warnUnsupported(`Servo.${method}`, "servo_pwm", file, line);
        return 0;
      }
      this.markModuleActive("servo_pwm");
      if (method === "attach") {
        const pin = Math.trunc(toNumber(args[0] ?? 0));
        obj.fields.__pin = pin;
        this.servos[pin] = 90;
        return 1;
      }
      if (method === "write") {
        const angle = Math.max(0, Math.min(180, Math.trunc(toNumber(args[0] ?? 90))));
        obj.fields.__angle = angle;
        const pin = Math.trunc(toNumber(obj.fields.__pin ?? -1));
        if (pin >= 0) this.servos[pin] = angle;
        return null;
      }
      if (method === "read") return toNumber(obj.fields.__angle ?? 90);
      if (method === "detach") {
        const pin = Math.trunc(toNumber(obj.fields.__pin ?? -1));
        if (pin >= 0) delete this.servos[pin];
        obj.fields.__pin = -1;
        return null;
      }
    }

    // 9. Extensible (Partial): WiFi
    if (obj.className === "WiFiClass") {
      if (!this.isModuleEnabled("wifi_esp32")) {
        this.warnUnsupported(`WiFi.${method}`, "wifi_esp32", file, line);
        return method === "status" ? 6 : method === "localIP" ? "0.0.0.0" : 0;
      }
      this.markModuleActive("wifi_esp32");
      if (method === "begin") {
        this.wifiMock.ssid = toDisplayString(args[0] ?? "VirtualAP");
        this.wifiMock.connected = true;
        this.wifiMock.ip = "192.168.4.1";
        this.logEvent("bus", `WiFi.begin("${this.wifiMock.ssid}") [VIRTUAL MOCK — no real 802.11 radio]`);
        return 3; // WL_CONNECTED
      }
      if (method === "status") return this.wifiMock.connected ? 3 : 6;
      if (method === "localIP") return this.wifiMock.ip;
      if (method === "RSSI") return this.wifiMock.rssi;
      if (method === "disconnect") {
        this.wifiMock.connected = false;
        return true;
      }
      return 0;
    }

    // 10. Bluetooth (Honest unsupported)
    if (obj.className === "BluetoothSerial" || obj.className === "BLEDevice") {
      this.warnUnsupported(`${obj.className}.${method}`, "bluetooth_ble", file, line);
      return false;
    }

    // 11. ESP utility class
    if (obj.className === "EspClass") {
      this.markModuleActive("esp32_mcu");
      if (method === "getFreeHeap") return 245760;
      if (method === "restart") {
        this.logEvent("lifecycle", "ESP.restart() requested by firmware — resetting virtual loop.");
        yield { type: "halt" };
        return null;
      }
      return 0;
    }

    return 0;
  }

  private formatSerialArg(val: RuntimeValue | undefined, formatArg: RuntimeValue | undefined): string {
    if (val === undefined) return "";
    if (typeof val === "number" && formatArg !== undefined) {
      const fmt = Math.trunc(toNumber(formatArg));
      if (fmt === 16) return Math.trunc(val).toString(16).toUpperCase();
      if (fmt === 2) return Math.trunc(val).toString(2);
      if (fmt === 8) return Math.trunc(val).toString(8);
      if (!Number.isInteger(val) && fmt >= 0 && fmt <= 6) return val.toFixed(fmt);
    }
    return toDisplayString(val);
  }
}
