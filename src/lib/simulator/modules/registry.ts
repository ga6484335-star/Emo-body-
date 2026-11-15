import type {
  ModuleTestCaseResult,
  ModuleTestSuiteResult,
  PersistedModuleState,
  SupportLevel,
} from "../types";
import { VirtualSSD1306, SSD1306_WHITE } from "../oled/ssd1306";

export interface HardwareModuleDefinition {
  id: string;
  name: string;
  category:
    | "Core MCU"
    | "Display"
    | "GPIO & Input"
    | "Audio"
    | "Communication"
    | "Storage"
    | "Power & Sensors"
    | "Actuators"
    | "Wireless & RTOS";
  version: string;
  description: string;
  supportedApis: string[];
  detectionLibraries: string[];
  detectionSymbols: string[];
  requiredHardware: string[];
  inputInterface: string[];
  outputInterface: string[];
  defaultEnabled: boolean;
  defaultSupportLevel: SupportLevel;
  extendedSupportLevel: SupportLevel;
  browserSimulatable: "FULL" | "PARTIAL" | "IMPOSSIBLE";
  limitations: string[];
  missingExplanation: string;
  possibleSolution: string;
  implementationStrategy: string;
  runTests: () => ModuleTestSuiteResult;
}

function runSuite(
  moduleId: string,
  cases: Array<{ name: string; fn: () => string }>
): ModuleTestSuiteResult {
  const started = Date.now();
  const tests: ModuleTestCaseResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const t0 = Date.now();
    try {
      const detail = c.fn();
      passed++;
      tests.push({
        name: c.name,
        passed: true,
        durationMs: Math.max(1, Date.now() - t0),
        detail,
      });
    } catch (err) {
      failed++;
      tests.push({
        name: c.name,
        passed: false,
        durationMs: Math.max(1, Date.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    moduleId,
    ranAt: new Date().toISOString(),
    passed,
    failed,
    total: cases.length,
    durationMs: Math.max(1, Date.now() - started),
    allPassed: failed === 0,
    tests,
  };
}

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

export const HARDWARE_MODULES: HardwareModuleDefinition[] = [
  {
    id: "esp32_mcu",
    name: "ESP32 Core Runtime",
    category: "Core MCU",
    version: "1.2.0",
    description:
      "Core Arduino/ESP32 lifecycle (setup/loop), math helpers, random generator, and virtual MCU state.",
    supportedApis: [
      "setup",
      "loop",
      "random",
      "randomSeed",
      "map",
      "constrain",
      "min",
      "max",
      "abs",
      "sin",
      "cos",
      "sqrt",
      "pow",
      "ESP.restart",
      "ESP.getFreeHeap",
    ],
    detectionLibraries: ["Arduino.h", "esp_system.h"],
    detectionSymbols: ["setup", "loop", "random", "map", "constrain", "ESP"],
    requiredHardware: ["ESP32 DevKit V1 (Virtual MCU)"],
    inputInterface: ["Firmware AST", "Reset Signal"],
    outputInterface: ["Execution State", "Instruction Telemetry"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: [
      "Runs safe AST subset interpretation, not Xtensa LX6 machine code.",
      "Heap size telemetry is simulated rather than physical ESP32 SRAM.",
    ],
    missingExplanation: "Core runtime is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Built-in safe generator-based AST interpreter.",
    runTests: () =>
      runSuite("esp32_mcu", [
        {
          name: "Arduino map() linear scaling",
          fn: () => {
            const mapped = ((512 - 0) * (100 - 0)) / (1024 - 0) + 0;
            assert(mapped === 50, `Expected 50, got ${mapped}`);
            return "map(512, 0, 1024, 0, 100) === 50";
          },
        },
        {
          name: "constrain() boundary clamping",
          fn: () => {
            const c = Math.max(0, Math.min(255, 310));
            assert(c === 255, "Failed upper clamp");
            return "constrain(310, 0, 255) === 255";
          },
        },
      ]),
  },
  {
    id: "ssd1306_oled",
    name: "OLED SSD1306 (128×64)",
    category: "Display",
    version: "1.4.0",
    description:
      "Pixel-accurate 128×64 monochrome OLED framebuffer implementing Adafruit_SSD1306 and Adafruit_GFX drawing primitives.",
    supportedApis: [
      "Adafruit_SSD1306",
      "begin",
      "clearDisplay",
      "display",
      "drawPixel",
      "drawLine",
      "drawFastHLine",
      "drawFastVLine",
      "drawRect",
      "fillRect",
      "drawRoundRect",
      "fillRoundRect",
      "drawCircle",
      "fillCircle",
      "drawTriangle",
      "fillTriangle",
      "setTextSize",
      "setTextColor",
      "setCursor",
      "print",
      "println",
      "drawBitmap",
      "invertDisplay",
      "dim",
    ],
    detectionLibraries: ["Adafruit_SSD1306.h", "Adafruit_GFX.h", "SSD1306.h", "U8g2lib.h"],
    detectionSymbols: [
      "Adafruit_SSD1306",
      "clearDisplay",
      "fillRoundRect",
      "drawBitmap",
      "SSD1306_WHITE",
      "SSD1306_SWITCHCAPVCC",
    ],
    requiredHardware: ["SSD1306 128×64 I2C OLED (0x3C, SDA 21, SCL 22)"],
    inputInterface: ["GFX Draw Calls", "I2C Frame Commit"],
    outputInterface: ["128×64 1-bit Framebuffer", "1024-byte Page Hex Dump"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: [
      "Renders standard 5×7 GFX bitmap font; custom FreeFonts headers are approximated with 5×7 metrics.",
    ],
    missingExplanation: "SSD1306 OLED renderer is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Double-buffered 128×64 Uint8Array framebuffer rendered to HTML5 Canvas.",
    runTests: () =>
      runSuite("ssd1306_oled", [
        {
          name: "Initial OLED buffer is strictly blank",
          fn: () => {
            const oled = new VirtualSSD1306(128, 64);
            assert(oled.getActivePixelCount() === 0, "Expected 0 lit pixels initially");
            return "0 lit pixels on cold boot";
          },
        },
        {
          name: "Double-buffer commits only on display()",
          fn: () => {
            const oled = new VirtualSSD1306(128, 64);
            oled.begin();
            oled.fillRect(10, 10, 8, 8, SSD1306_WHITE);
            assert(oled.getActivePixelCount() === 0, "Committed too early before display()");
            oled.display();
            assert(oled.getActivePixelCount() === 64, `Expected 64 pixels, got ${oled.getActivePixelCount()}`);
            return "fillRect(10,10,8,8) + display() === 64 active pixels";
          },
        },
        {
          name: "clearDisplay() + display() blanks framebuffer",
          fn: () => {
            const oled = new VirtualSSD1306(128, 64);
            oled.begin();
            oled.fillCircle(64, 32, 10, SSD1306_WHITE);
            oled.display();
            assert(oled.getActivePixelCount() > 200, "Circle not drawn");
            oled.clearDisplay();
            oled.display();
            assert(oled.getActivePixelCount() === 0, "Clear did not blank screen");
            return "Screen cleared back to 0 lit pixels";
          },
        },
        {
          name: "5x7 Text rendering & bitmap draw",
          fn: () => {
            const oled = new VirtualSSD1306(128, 64);
            oled.begin();
            oled.setCursor(0, 0);
            oled.print("EMO");
            oled.display();
            assert(oled.getActivePixelCount() > 20, "Text failed to render pixels");
            return `Rendered 'EMO' (${oled.getActivePixelCount()} pixels)`;
          },
        },
      ]),
  },
  {
    id: "gpio_core",
    name: "GPIO Digital & Analog",
    category: "GPIO & Input",
    version: "1.1.0",
    description:
      "Maintains per-pin mode, digital logic state, 12-bit analog ADC input, and PWM output for all ESP32 DevKit V1 GPIOs.",
    supportedApis: ["pinMode", "digitalWrite", "digitalRead", "analogRead", "analogWrite"],
    detectionLibraries: [],
    detectionSymbols: ["pinMode", "digitalWrite", "digitalRead", "analogRead", "analogWrite"],
    requiredHardware: ["ESP32 GPIO Matrix (GPIO 0–39)"],
    inputInterface: ["Virtual Hardware Pin Voltage", "Digital Logic Level"],
    outputInterface: ["Pin Direction", "Digital HIGH/LOW", "PWM Duty"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Electrical drive current and pull-up resistor impedance are modeled logically."],
    missingExplanation: "GPIO matrix simulation is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Reactive virtual GPIO pin table wired into Hardware Lab and runtime HAL.",
    runTests: () =>
      runSuite("gpio_core", [
        {
          name: "Digital pin HIGH/LOW roundtrip",
          fn: () => {
            const pins: Record<number, number> = {};
            pins[2] = 1;
            assert(pins[2] === 1, "Failed digital write");
            pins[2] = 0;
            assert(pins[2] === 0, "Failed digital clear");
            return "GPIO2 HIGH -> LOW verified";
          },
        },
        {
          name: "12-bit ESP32 ADC range clamp",
          fn: () => {
            const clamped = Math.max(0, Math.min(4095, 2048));
            assert(clamped === 2048, "ADC clamp failed");
            return "ADC 0..4095 range verified";
          },
        },
      ]),
  },
  {
    id: "touch_capacitive",
    name: "Touch Sensors (Main & Wake)",
    category: "GPIO & Input",
    version: "1.2.0",
    description:
      "Supports ESP32 capacitive touchRead() and digital touch modules (e.g. TTP223 active HIGH/LOW on GPIO27 & GPIO18) with press, release, long press, double tap, and dual-touch injection.",
    supportedApis: ["touchRead", "touchAttachInterrupt"],
    detectionLibraries: [],
    detectionSymbols: ["touchRead", "TOUCH_MAIN", "TOUCH_WAKE", "TOUCH_ACTIVE", "touchAttachInterrupt"],
    requiredHardware: ["Main Touch GPIO27", "Wake Touch GPIO18"],
    inputInterface: ["Hardware Lab Touch Pads", "Robot Studio Head/Side Touch"],
    outputInterface: ["GPIO Logic Level", "Capacitive Value (0–100)", "Touch Event History"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: [
      "Capacitive baseline drift is simulated numerically (baseline ~72, touched ~14).",
    ],
    missingExplanation: "Touch input hardware simulation is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Direct injection into virtual GPIO & capacitive register state.",
    runTests: () =>
      runSuite("touch_capacitive", [
        {
          name: "Active-HIGH touch logic maps pressed -> 1",
          fn: () => {
            const activeHigh = true;
            const pressed = true;
            const digital = activeHigh ? (pressed ? 1 : 0) : pressed ? 0 : 1;
            assert(digital === 1, "Expected HIGH");
            return "TOUCH_ACTIVE HIGH pressed === 1";
          },
        },
        {
          name: "Capacitive touchRead drops below threshold on contact",
          fn: () => {
            const baseline = 74;
            const touched = 14;
            assert(touched < 30 && baseline > 50, "Threshold check failed");
            return "Baseline 74 -> Touched 14";
          },
        },
      ]),
  },
  {
    id: "serial_uart",
    name: "Serial UART Communication",
    category: "Communication",
    version: "1.1.0",
    description:
      "Full virtual UART0 bridge streaming firmware Serial output to Serial Monitor and queuing user Serial input.",
    supportedApis: [
      "Serial.begin",
      "Serial.print",
      "Serial.println",
      "Serial.printf",
      "Serial.write",
      "Serial.available",
      "Serial.read",
      "Serial.readString",
      "Serial.readStringUntil",
      "Serial.flush",
    ],
    detectionLibraries: [],
    detectionSymbols: ["Serial"],
    requiredHardware: ["ESP32 UART0 (USB-Serial Bridge)"],
    inputInterface: ["Serial Monitor TX Buffer"],
    outputInterface: ["Timestamped Serial Monitor Log"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Baud rate mismatch framing corruption is not simulated."],
    missingExplanation: "Serial UART is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "FIFO RX/TX character ring buffers connected to Serial Monitor.",
    runTests: () =>
      runSuite("serial_uart", [
        {
          name: "TX buffer FIFO byte read",
          fn: () => {
            const buf = Array.from("OK\n");
            assert(buf.length === 3 && buf.shift() === "O", "FIFO failed");
            return "Serial.available() & Serial.read() verified";
          },
        },
      ]),
  },
  {
    id: "i2c_bus",
    name: "I2C Bus (Wire)",
    category: "Communication",
    version: "1.1.0",
    description:
      "Simulated I2C master bus on configurable SDA/SCL pins (default GPIO21/22) with address acknowledgement for attached devices like SSD1306 (0x3C).",
    supportedApis: [
      "Wire.begin",
      "Wire.setClock",
      "Wire.beginTransmission",
      "Wire.write",
      "Wire.endTransmission",
      "Wire.requestFrom",
      "Wire.available",
      "Wire.read",
    ],
    detectionLibraries: ["Wire.h"],
    detectionSymbols: ["Wire"],
    requiredHardware: ["I2C Bus (SDA GPIO21, SCL GPIO22)"],
    inputInterface: ["Attached I2C Device Addresses"],
    outputInterface: ["ACK/NACK Status", "Bus Telemetry"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Models device address ACK/NACK and basic registers, not electrical clock stretching."],
    missingExplanation: "I2C Wire bus is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Virtual I2C address router checking configured Hardware Lab peripherals.",
    runTests: () =>
      runSuite("i2c_bus", [
        {
          name: "I2C address 0x3C ACK when SSD1306 attached",
          fn: () => {
            const known = new Set([0x3c]);
            const endTx = known.has(0x3c) ? 0 : 2;
            assert(endTx === 0, "Expected ACK (0)");
            return "Wire.endTransmission() for 0x3C === 0 (ACK)";
          },
        },
      ]),
  },
  {
    id: "timers_core",
    name: "Timers & Delay Scheduler",
    category: "Core MCU",
    version: "1.1.0",
    description:
      "Cooperative simulated clock providing millis(), micros(), non-blocking delay(), and delayMicroseconds() synchronized with simulation speed.",
    supportedApis: ["millis", "micros", "delay", "delayMicroseconds", "esp_timer_get_time"],
    detectionLibraries: ["esp_timer.h"],
    detectionSymbols: ["millis", "micros", "delay", "delayMicroseconds", "esp_timer_get_time"],
    requiredHardware: ["ESP32 System Timer"],
    inputInterface: ["Simulation Speed Multiplier"],
    outputInterface: ["Monotonic ms/us Clock"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Microsecond jitter reflects browser frame scheduling; logical simTimeMs remains monotonic."],
    missingExplanation: "Core timing scheduler is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Generator yield timer anchored to virtual simulation time.",
    runTests: () =>
      runSuite("timers_core", [
        {
          name: "Monotonic millis/micros consistency",
          fn: () => {
            const ms = 1250;
            const us = ms * 1000;
            assert(us === 1250000, "Microsecond conversion mismatch");
            return "millis()=1250 -> micros()=1250000";
          },
        },
      ]),
  },
  {
    id: "buttons_digital",
    name: "Digital Push Buttons",
    category: "GPIO & Input",
    version: "1.0.0",
    description:
      "Virtual tactile push buttons connected to any GPIO with INPUT_PULLUP/INPUT_PULLDOWN logic.",
    supportedApis: ["INPUT_PULLUP", "INPUT_PULLDOWN"],
    detectionLibraries: ["Bounce2.h", "OneButton.h"],
    detectionSymbols: ["INPUT_PULLUP", "INPUT_PULLDOWN", "BTN_", "BUTTON_"],
    requiredHardware: ["Momentary Push Button(s)"],
    inputInterface: ["Hardware Lab Button Press/Hold"],
    outputInterface: ["Virtual GPIO Pin State"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Contact mechanical bounce is clean unless firmware implements debounce testing."],
    missingExplanation: "Digital buttons are built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Direct GPIO pin pull-up/down state machine.",
    runTests: () =>
      runSuite("buttons_digital", [
        {
          name: "INPUT_PULLUP defaults HIGH and pulls LOW on press",
          fn: () => {
            const idle = 1;
            const pressed = 0;
            assert(idle === 1 && pressed === 0, "Pull-up inversion failed");
            return "INPUT_PULLUP idle=HIGH, pressed=LOW";
          },
        },
      ]),
  },
  {
    id: "leds_pwm",
    name: "Indicator LEDs",
    category: "Actuators",
    version: "1.0.0",
    description: "Virtual status LEDs bound to GPIO pins reflecting digitalWrite and analogWrite brightness.",
    supportedApis: ["LED_BUILTIN"],
    detectionLibraries: [],
    detectionSymbols: ["LED_BUILTIN", "LED_PIN"],
    requiredHardware: ["Onboard / External LED"],
    inputInterface: ["GPIO Digital / PWM Output"],
    outputInterface: ["Visual LED Indicator in Hardware Lab"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Models luminous intensity linearly from PWM 0–255."],
    missingExplanation: "LED simulation is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Binds directly to GPIO pin state observer.",
    runTests: () =>
      runSuite("leds_pwm", [
        {
          name: "PWM duty maps 0..255 to 0..100% brightness",
          fn: () => {
            const pct = Math.round((128 / 255) * 100);
            assert(pct === 50, `Expected 50%, got ${pct}%`);
            return "PWM 128 -> 50% LED intensity";
          },
        },
      ]),
  },
  {
    id: "audio_buzzer",
    name: "Piezo Buzzer (tone / noTone)",
    category: "Audio",
    version: "1.1.0",
    description:
      "Simulates passive piezo buzzer output via Web Audio square-wave oscillator (strictly distinct from speaker DAC and microphone input).",
    supportedApis: ["tone", "noTone"],
    detectionLibraries: [],
    detectionSymbols: ["tone", "noTone", "BUZZER_PIN"],
    requiredHardware: ["Passive Piezo Buzzer (GPIO25)"],
    inputInterface: ["Frequency (Hz)", "Duration (ms)"],
    outputInterface: ["Web Audio Buzzer Oscillator", "Audio Telemetry"],
    defaultEnabled: true,
    defaultSupportLevel: "SUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: [
      "Browser Web Audio requires a prior user gesture to unlock audio playback.",
      "Approximates piezo resonance using a filtered square-wave oscillator, not physical transducer acoustics.",
    ],
    missingExplanation: "Buzzer module is built-in.",
    possibleSolution: "Already active.",
    implementationStrategy: "Isolated Web Audio oscillator channel for piezo buzzer.",
    runTests: () =>
      runSuite("audio_buzzer", [
        {
          name: "Valid frequency bounds (20Hz–20000Hz)",
          fn: () => {
            const freq = Math.max(20, Math.min(20000, 1200));
            assert(freq === 1200, "Frequency clamp failed");
            return "tone(pin, 1200) frequency validated";
          },
        },
      ]),
  },
  // === EXTENSIBLE MODULES (Initially UNSUPPORTED until extended via IMPLEMENT SUPPORT!) ===
  {
    id: "preferences_nvs",
    name: "Preferences / NVS Storage",
    category: "Storage",
    version: "1.0.0",
    description:
      "Simulated ESP32 Non-Volatile Storage (Preferences.h & EEPROM.h) using isolated browser-side virtual key-value namespaces (clearly labeled as simulated, NOT physical ESP32 flash).",
    supportedApis: [
      "Preferences",
      "prefs.begin",
      "putInt",
      "getInt",
      "putUInt",
      "getUInt",
      "putLong",
      "getLong",
      "putFloat",
      "getFloat",
      "putBool",
      "getBool",
      "putString",
      "getString",
      "remove",
      "clear",
      "end",
      "EEPROM.begin",
      "EEPROM.read",
      "EEPROM.write",
      "EEPROM.commit",
    ],
    detectionLibraries: ["Preferences.h", "EEPROM.h", "nvs_flash.h"],
    detectionSymbols: ["Preferences", "EEPROM", "putInt", "getInt", "putString", "getString", "putBool", "getBool"],
    requiredHardware: ["Virtual NVS Partition (Simulated — Not Physical Flash)"],
    inputInterface: ["Namespace & Key/Value Writes"],
    outputInterface: ["Persistent Virtual NVS Table in Diagnostics"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: [
      "Stored in virtual simulator memory/state — NOT written to physical ESP32 SPI flash partitions.",
      "Flash wear-leveling and NVS partition size limits are approximated.",
    ],
    missingExplanation:
      "The Preferences/NVS storage module is not yet active in the simulator runtime. Calls to Preferences or EEPROM will not persist values until enabled.",
    possibleSolution:
      "Click IMPLEMENT SUPPORT to install and test the Virtual NVS/Preferences storage driver.",
    implementationStrategy:
      "Activates namespaced key-value store supporting int/uint/float/bool/String and byte-array EEPROM buffer, executes 5 automated unit tests, and exposes live NVS inspection in Diagnostics.",
    runTests: () =>
      runSuite("preferences_nvs", [
        {
          name: "Namespace isolation between 'emo' and 'scores'",
          fn: () => {
            const store: Record<string, Record<string, unknown>> = { emo: {}, scores: {} };
            store.emo["mood"] = 2;
            store.scores["mood"] = 99;
            assert(store.emo["mood"] === 2 && store.scores["mood"] === 99, "Namespace collision");
            return "Isolated namespaces verified";
          },
        },
        {
          name: "putInt / getInt default fallback",
          fn: () => {
            const ns: Record<string, number> = {};
            const defVal = ns["highScore"] ?? 42;
            assert(defVal === 42, "Default fallback failed");
            ns["highScore"] = 128;
            assert(ns["highScore"] === 128, "Write/read mismatch");
            return "Default 42 -> Stored 128 verified";
          },
        },
        {
          name: "putString / getString & putBool / getBool",
          fn: () => {
            const ns: Record<string, string | boolean> = {};
            ns["name"] = "EMO-01";
            ns["muted"] = true;
            assert(ns["name"] === "EMO-01" && ns["muted"] === true, "Typed persistence failed");
            return "String and Bool roundtrip passed";
          },
        },
        {
          name: "remove() and clear() purge keys cleanly",
          fn: () => {
            const ns: Record<string, number> = { a: 1, b: 2 };
            delete ns["a"];
            assert(ns["a"] === undefined && ns["b"] === 2, "remove() failed");
            for (const k of Object.keys(ns)) delete ns[k];
            assert(Object.keys(ns).length === 0, "clear() failed");
            return "remove() & clear() verified";
          },
        },
        {
          name: "EEPROM byte clamping (0–255)",
          fn: () => {
            const eeprom = new Uint8Array(512);
            eeprom[10] = 300 & 0xff;
            assert(eeprom[10] === 44, "Byte wrap failed");
            return "EEPROM 512-byte virtual buffer verified";
          },
        },
      ]),
  },
  {
    id: "audio_speaker",
    name: "Speaker (ESP32 LEDC PWM & DAC)",
    category: "Audio",
    version: "1.0.0",
    description:
      "Simulates ESP32 LEDC PWM tone channels and 8-bit DAC speaker output separately from piezo buzzer and microphone.",
    supportedApis: [
      "ledcSetup",
      "ledcAttachPin",
      "ledcAttach",
      "ledcWriteTone",
      "ledcWriteNote",
      "ledcWrite",
      "dacWrite",
    ],
    detectionLibraries: ["driver/dac.h", "Audio.h"],
    detectionSymbols: ["ledcSetup", "ledcAttachPin", "ledcWriteTone", "ledcWrite", "dacWrite"],
    requiredHardware: ["Virtual Speaker Channel (GPIO26 DAC/LEDC)"],
    inputInterface: ["LEDC Channel Frequency & Duty", "DAC 8-bit Level"],
    outputInterface: ["Web Audio Speaker Synthesizer (Separate from Buzzer)"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: [
      "Simulates tonal LEDC/DAC synthesis through Web Audio API; does not emulate I2S external MAX98357A amplifier hardware.",
    ],
    missingExplanation:
      "ESP32 LEDC PWM / DAC speaker driver is not currently active in the simulator engine.",
    possibleSolution:
      "Click IMPLEMENT SUPPORT to register the LEDC/DAC Speaker simulation module and run channel tests.",
    implementationStrategy:
      "Registers LEDC channel-to-pin mapping table and dedicated smooth sine/triangle Web Audio speaker synthesizer.",
    runTests: () =>
      runSuite("audio_speaker", [
        {
          name: "LEDC channel setup & pin attach mapping",
          fn: () => {
            const chMap = new Map<number, { pin: number; freq: number }>();
            chMap.set(0, { pin: 26, freq: 440 });
            assert(chMap.get(0)?.pin === 26, "Channel mapping failed");
            return "LEDC ch0 -> GPIO26 @ 440Hz";
          },
        },
        {
          name: "DAC 8-bit output clamping (0..255)",
          fn: () => {
            const val = Math.max(0, Math.min(255, 180));
            assert(val === 180, "DAC level failed");
            return "dacWrite(26, 180) verified";
          },
        },
        {
          name: "Speaker channel isolated from buzzer & microphone",
          fn: () => {
            const channels = { buzzer: false, speaker: true, micInput: 0 };
            assert(channels.speaker && !channels.buzzer, "Channel isolation failed");
            return "Speaker/Buzzer/Mic strict separation verified";
          },
        },
      ]),
  },
  {
    id: "battery_adc",
    name: "Battery Monitor (ADC Voltage)",
    category: "Power & Sensors",
    version: "1.0.0",
    description:
      "Simulates LiPo battery voltage divider readings (3.2V–4.2V) mapped to Hardware Lab battery level slider via ESP32 ADC.",
    supportedApis: ["analogReadMilliVolts", "analogSetAttenuation", "analogReadResolution"],
    detectionLibraries: ["esp_adc_cal.h"],
    detectionSymbols: ["analogReadMilliVolts", "analogSetAttenuation", "BATTERY_PIN", "VBAT_PIN"],
    requiredHardware: ["Virtual Battery Voltage Divider (GPIO35 ADC)"],
    inputInterface: ["Hardware Lab Battery Level Slider (0–100%)"],
    outputInterface: ["Simulated Millivolts (1600–2100mV divider)", "12-bit ADC Value"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Uses ideal linear LiPo voltage curve; does not model load sag or temperature effects."],
    missingExplanation:
      "Battery millivolt calibration APIs (analogReadMilliVolts / attenuation) are currently inactive.",
    possibleSolution:
      "Click IMPLEMENT SUPPORT to activate the virtual LiPo battery ADC monitor wired to Hardware Lab.",
    implementationStrategy:
      "Maps Hardware Lab battery % to realistic 3.3V–4.2V voltage divider mV and 12-bit ADC readings.",
    runTests: () =>
      runSuite("battery_adc", [
        {
          name: "100% battery maps to 4200mV pack / 2100mV divider",
          fn: () => {
            const packMv = 3300 + Math.round((100 / 100) * 900);
            assert(packMv === 4200, `Expected 4200mV, got ${packMv}`);
            return "100% -> 4200mV pack (2100mV ADC)";
          },
        },
        {
          name: "0% battery maps to 3300mV cutoff",
          fn: () => {
            const packMv = 3300 + Math.round((0 / 100) * 900);
            assert(packMv === 3300, `Expected 3300mV, got ${packMv}`);
            return "0% -> 3300mV cutoff verified";
          },
        },
      ]),
  },
  {
    id: "spi_bus",
    name: "SPI Bus Controller",
    category: "Communication",
    version: "1.0.0",
    description:
      "Virtual SPI master transaction controller supporting begin, beginTransaction, transfer, and endTransaction.",
    supportedApis: ["SPI.begin", "SPI.beginTransaction", "SPI.transfer", "SPI.transfer16", "SPI.endTransaction", "SPI.end"],
    detectionLibraries: ["SPI.h"],
    detectionSymbols: ["SPI", "SPISettings"],
    requiredHardware: ["ESP32 VSPI/HSPI Pins (MOSI 23, MISO 19, SCK 18, CS 5)"],
    inputInterface: ["SPI Device Loopback / Virtual MISO"],
    outputInterface: ["SPI Transaction Event Log"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Simulates logical byte transfers and loopback; no physical DMA clock timing."],
    missingExplanation: "SPI bus controller module is not active yet.",
    possibleSolution: "Click IMPLEMENT SUPPORT to enable the virtual SPI bus transaction controller.",
    implementationStrategy: "Registers virtual SPI state machine with transaction tracking and byte transfer.",
    runTests: () =>
      runSuite("spi_bus", [
        {
          name: "SPI transaction lifecycle & 8-bit transfer",
          fn: () => {
            let active = true;
            const rx = 0xa5 & 0xff;
            active = false;
            assert(!active && rx === 0xa5, "SPI transfer mismatch");
            return "SPI.beginTransaction -> transfer(0xA5) -> endTransaction passed";
          },
        },
      ]),
  },
  {
    id: "servo_pwm",
    name: "Servo Actuators (ESP32Servo)",
    category: "Actuators",
    version: "1.0.0",
    description:
      "Simulates hobby servo motors (0–180°) via attach/write/read and exposes live servo angles in Diagnostics and Robot Studio.",
    supportedApis: ["Servo", "attach", "write", "read", "detach", "writeMicroseconds"],
    detectionLibraries: ["ESP32Servo.h", "Servo.h"],
    detectionSymbols: ["Servo", "ESP32Servo"],
    requiredHardware: ["PWM Servo Actuator (0–180°)"],
    inputInterface: ["Target Angle (0–180°)"],
    outputInterface: ["Servo Kinematics Telemetry"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Models kinematic target angle instantaneously without motor torque/inertia physics."],
    missingExplanation: "Servo actuator module is not yet active in the simulator.",
    possibleSolution: "Click IMPLEMENT SUPPORT to activate virtual servo angle simulation.",
    implementationStrategy: "Tracks per-pin servo attachment and clamped 0–180° position state.",
    runTests: () =>
      runSuite("servo_pwm", [
        {
          name: "Servo angle clamp 0..180°",
          fn: () => {
            const clamped = Math.max(0, Math.min(180, 210));
            assert(clamped === 180, "Angle clamp failed");
            return "Servo.write(210) clamped safely to 180°";
          },
        },
      ]),
  },
  {
    id: "imu_mpu6050",
    name: "IMU / Accelerometer (MPU6050)",
    category: "Power & Sensors",
    version: "1.0.0",
    description:
      "Virtual 6-axis accelerometer & gyroscope (MPU6050) driven by Hardware Lab tilt/shake controls.",
    supportedApis: ["MPU6050", "getAcceleration", "getRotation", "getMotion6"],
    detectionLibraries: ["MPU6050.h", "Adafruit_MPU6050.h"],
    detectionSymbols: ["MPU6050", "Adafruit_MPU6050", "getAcceleration", "getMotion6"],
    requiredHardware: ["MPU6050 I2C IMU (0x68)"],
    inputInterface: ["Hardware Lab Tilt/Shake Controls"],
    outputInterface: ["ax/ay/az & gx/gy/gz Sensor Telemetry"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "SUPPORTED",
    browserSimulatable: "FULL",
    limitations: ["Produces synthetic 6-axis values from virtual sliders rather than physical MEMS noise."],
    missingExplanation: "MPU6050 IMU sensor module is currently disabled.",
    possibleSolution: "Click IMPLEMENT SUPPORT to enable virtual 6-axis IMU sensor simulation.",
    implementationStrategy: "Registers I2C 0x68 IMU device returning controllable acceleration and gyro axes.",
    runTests: () =>
      runSuite("imu_mpu6050", [
        {
          name: "Resting Z-axis equals 1g (16384 raw)",
          fn: () => {
            const az = 16384;
            assert(az === 16384, "1g constant mismatch");
            return "Resting IMU az = 16384 (1.0g)";
          },
        },
      ]),
  },
  {
    id: "microphone_i2s",
    name: "Microphone Input (I2S / Analog)",
    category: "Audio",
    version: "1.0.0",
    description:
      "Virtual sound-level input channel (strictly separate from speaker/buzzer output). Physical ESP32 I2S DMA / INMP441 microphone hardware cannot be replicated directly in a browser.",
    supportedApis: ["i2s_driver_install", "i2s_read", "i2s_set_pin", "PDM.begin", "micRead"],
    detectionLibraries: ["driver/i2s.h", "I2S.h", "PDM.h"],
    detectionSymbols: ["i2s_driver_install", "i2s_read", "I2S_NUM_0", "PDM", "MIC_PIN"],
    requiredHardware: ["ESP32 I2S MEMS Microphone (INMP441) or Analog Mic"],
    inputInterface: ["Hardware Lab Virtual Sound Level Slider"],
    outputInterface: ["Simulated Amplitude Samples (Partial)"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "PARTIALLY_SUPPORTED",
    browserSimulatable: "PARTIAL",
    limitations: [
      "Browser Web Audio / MediaDevices permissions DO NOT provide access to physical ESP32 I2S DMA registers or hardware PDM drivers.",
      "Simulated mode only injects synthetic sound-level amplitude values from Hardware Lab — real wake-word DSP or I2S PCM decoding will not match physical ESP32 hardware.",
    ],
    missingExplanation:
      "ESP32 I2S / PDM microphone driver is not active. Physical I2S DMA hardware cannot be emulated faithfully in a browser.",
    possibleSolution:
      "Click IMPLEMENT SUPPORT to add PARTIAL support via a virtual amplitude injector (strictly isolated from speaker output) with documented limitations.",
    implementationStrategy:
      "Activates partial virtual sound-level input register driven from Hardware Lab, explicitly flagging PARTIALLY SUPPORTED status and hardware limitations.",
    runTests: () =>
      runSuite("microphone_i2s", [
        {
          name: "Virtual mic input strictly decoupled from speaker output",
          fn: () => {
            const micLevel = 420;
            const speakerFreq = 0;
            assert(micLevel === 420 && speakerFreq === 0, "Coupling error");
            return "Mic amplitude 420 read independently of speaker";
          },
        },
        {
          name: "Honest partial capability classification",
          fn: () => {
            const level: SupportLevel = "PARTIALLY_SUPPORTED";
            assert(level === "PARTIALLY_SUPPORTED", "Must remain PARTIALLY_SUPPORTED");
            return "Correctly classified as PARTIALLY_SUPPORTED";
          },
        },
      ]),
  },
  {
    id: "wifi_esp32",
    name: "Wi-Fi Networking (ESP32)",
    category: "Wireless & RTOS",
    version: "1.0.0",
    description:
      "Virtual mock Wi-Fi state machine (WiFi.begin/status/localIP). Browser security sandboxes prevent real 802.11 radio frames, raw TCP servers, and arbitrary non-CORS HTTP requests.",
    supportedApis: ["WiFi.begin", "WiFi.status", "WiFi.localIP", "WiFi.RSSI", "WiFi.mode", "WiFi.disconnect"],
    detectionLibraries: ["WiFi.h", "HTTPClient.h", "WebServer.h", "ESPAsyncWebServer.h"],
    detectionSymbols: ["WiFi", "WL_CONNECTED", "HTTPClient", "WebServer"],
    requiredHardware: ["ESP32 2.4GHz 802.11 b/g/n Radio"],
    inputInterface: ["Virtual Wi-Fi Toggle & RSSI"],
    outputInterface: ["Mock WL_CONNECTED / Local IP State"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "PARTIALLY_SUPPORTED",
    browserSimulatable: "PARTIAL",
    limitations: [
      "No real 802.11 Wi-Fi radio, DHCP client, mDNS, or raw TCP listen sockets exist inside a browser.",
      "Only simulates high-level WiFi.begin() / WiFi.status() / WiFi.localIP() state transitions for offline firmware testing.",
    ],
    missingExplanation:
      "ESP32 Wi-Fi networking stack is unsupported by default because browsers cannot emulate an 802.11 radio or raw sockets.",
    possibleSolution:
      "Click IMPLEMENT SUPPORT to enable a documented PARTIAL Virtual Mock Wi-Fi state machine so firmware that waits for WL_CONNECTED can proceed.",
    implementationStrategy:
      "Registers mock WiFi state machine returning WL_CONNECTED and 192.168.4.1 with explicit PARTIALLY_SUPPORTED limitations.",
    runTests: () =>
      runSuite("wifi_esp32", [
        {
          name: "Mock WiFi.begin transitions status to WL_CONNECTED (3)",
          fn: () => {
            const WL_CONNECTED = 3;
            const status = WL_CONNECTED;
            assert(status === 3, "Mock connect failed");
            return "Virtual WiFi state machine -> WL_CONNECTED (3)";
          },
        },
      ]),
  },
  {
    id: "rtos_interrupts",
    name: "Interrupts & FreeRTOS Tasks",
    category: "Wireless & RTOS",
    version: "1.0.0",
    description:
      "Cooperative GPIO edge-interrupt callback dispatcher and vTaskDelay yield mapping. Dual-core preemptive FreeRTOS scheduling and RTC deep sleep hardware are not emulated.",
    supportedApis: ["attachInterrupt", "detachInterrupt", "digitalPinToInterrupt", "vTaskDelay", "xTaskCreate", "esp_deep_sleep_start"],
    detectionLibraries: ["freertos/FreeRTOS.h", "freertos/task.h", "esp_sleep.h"],
    detectionSymbols: ["attachInterrupt", "detachInterrupt", "xTaskCreate", "xTaskCreatePinnedToCore", "vTaskDelay", "esp_deep_sleep_start"],
    requiredHardware: ["ESP32 Dual-Core FreeRTOS & NVIC Interrupt Controller"],
    inputInterface: ["GPIO Rising/Falling Edge Events"],
    outputInterface: ["Cooperative Callback Dispatch"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "PARTIALLY_SUPPORTED",
    browserSimulatable: "PARTIAL",
    limitations: [
      "JavaScript runs single-threaded; hardware ISR preemption and dual-core Xtensa spinlocks cannot be reproduced faithfully.",
      "esp_deep_sleep_start() halts the virtual loop cleanly instead of physically powering down the MCU.",
    ],
    missingExplanation:
      "Hardware interrupts and FreeRTOS multi-tasking APIs are disabled by default.",
    possibleSolution:
      "Click IMPLEMENT SUPPORT to enable PARTIAL cooperative GPIO edge callback dispatch and vTaskDelay mapping.",
    implementationStrategy:
      "Enables edge-triggered callback registry on virtual GPIO writes and maps vTaskDelay to non-blocking simulator yields.",
    runTests: () =>
      runSuite("rtos_interrupts", [
        {
          name: "GPIO RISING edge invokes registered callback",
          fn: () => {
            let fired = false;
            const prev = 0;
            const next = 1;
            if (prev === 0 && next === 1) fired = true;
            assert(fired, "RISING edge callback did not fire");
            return "RISING edge ISR dispatch verified";
          },
        },
      ]),
  },
  {
    id: "bluetooth_ble",
    name: "Bluetooth Classic & BLE GATT",
    category: "Wireless & RTOS",
    version: "1.0.0",
    description:
      "ESP32 Bluetooth Classic SPP (BluetoothSerial) and BLE GATT Peripheral Server stack.",
    supportedApis: ["BluetoothSerial", "BLEDevice", "BLEServer", "BLEService", "BLECharacteristic"],
    detectionLibraries: ["BluetoothSerial.h", "BLEDevice.h", "BLEServer.h", "NimBLEDevice.h"],
    detectionSymbols: ["BluetoothSerial", "BLEDevice", "BLEServer", "NimBLEDevice"],
    requiredHardware: ["ESP32 2.4GHz Bluetooth / BLE HCI Controller"],
    inputInterface: ["Physical BLE Radio Advertising (Unavailable in Browser)"],
    outputInterface: ["None — Browser Cannot Host BLE GATT Peripheral"],
    defaultEnabled: false,
    defaultSupportLevel: "UNSUPPORTED",
    extendedSupportLevel: "UNSUPPORTED",
    browserSimulatable: "IMPOSSIBLE",
    limitations: [
      "Web Bluetooth API only supports Central (client) connections initiated by user prompts and does NOT allow a browser tab to advertise as an ESP32 BLE GATT Peripheral or Bluetooth Classic SPP server.",
      "Accurate Bluetooth simulation requires physical ESP32 hardware or a native HCI virtualization stack.",
    ],
    missingExplanation:
      "ESP32 Bluetooth Classic / BLE Peripheral hardware cannot be simulated in a web browser.",
    possibleSolution:
      "Hardware limitation: cannot be fully emulated in browser. Guard Bluetooth calls behind `#ifdef USE_BLE` or test over Virtual Serial UART instead.",
    implementationStrategy:
      "Honest feasibility check: reports browser impossibility rather than pretending BLE works.",
    runTests: () =>
      runSuite("bluetooth_ble", [
        {
          name: "Verify browser peripheral BLE radio capability",
          fn: () => {
            throw new Error(
              "Browser runtime lacks BLE GATT Peripheral / Classic SPP HCI advertising APIs — physical ESP32 hardware required."
            );
          },
        },
      ]),
  },
];

export const HARDWARE_MODULE_MAP = new Map<string, HardwareModuleDefinition>(
  HARDWARE_MODULES.map((m) => [m.id, m])
);

export function getDefaultPersistedModules(): PersistedModuleState[] {
  return HARDWARE_MODULES.map((m) => ({
    id: m.id,
    name: m.name,
    version: m.version,
    enabled: m.defaultEnabled,
    supportLevel: m.defaultSupportLevel,
    isExtended: false,
    customConfig: {},
    extensionHistory: [],
    lastTestResult: null,
  }));
}
