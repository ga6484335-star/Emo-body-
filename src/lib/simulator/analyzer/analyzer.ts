import type {
  AnalyzedEnum,
  AnalyzedFunction,
  AnalyzedStructOrClass,
  AnalyzedVariable,
  CapabilityReportEntry,
  DetectionEvidence,
  DiagnosticMessage,
  FirmwareAnalysisReport,
  FirmwareFileData,
  GpioPinUsage,
  PersistedModuleState,
} from "../types";
import type { Expression, Statement, TopLevelDecl, VarDecl } from "../parser/ast";
import { parseFirmwareProject } from "../parser/parser";
import { HARDWARE_MODULES, getDefaultPersistedModules } from "../modules/registry";

function estimateTypeBytes(typeName: string): number {
  const t = typeName.toLowerCase();
  if (t.includes("uint8") || t.includes("int8") || t.includes("byte") || t.includes("char") || t.includes("bool")) {
    return 1;
  }
  if (t.includes("uint16") || t.includes("int16") || t.includes("short")) return 2;
  if (t.includes("double") || t.includes("64")) return 8;
  if (t.includes("string")) return 16;
  return 4; // ESP32 32-bit int / float / pointer
}

function evalConstInt(expr: Expression | null, macros: Map<string, number>): number | null {
  if (!expr) return null;
  if (expr.kind === "NumberLiteral") return expr.value;
  if (expr.kind === "Identifier") {
    if (macros.has(expr.name)) return macros.get(expr.name) ?? null;
    if (/^GPIO_?(\d+)$/i.test(expr.name)) {
      return parseInt(expr.name.replace(/^GPIO_?/i, ""), 10);
    }
    if (/^D(\d+)$/.test(expr.name)) {
      return parseInt(expr.name.slice(1), 10);
    }
    return null;
  }
  if (expr.kind === "UnaryExpr" && expr.operator === "-") {
    const v = evalConstInt(expr.operand, macros);
    return v !== null ? -v : null;
  }
  if (expr.kind === "BinaryExpr") {
    const l = evalConstInt(expr.left, macros);
    const r = evalConstInt(expr.right, macros);
    if (l === null || r === null) return null;
    if (expr.operator === "+") return l + r;
    if (expr.operator === "-") return l - r;
    if (expr.operator === "*") return l * r;
    if (expr.operator === "/" && r !== 0) return Math.trunc(l / r);
  }
  return null;
}

export interface FullAnalysisOutput {
  analysisReport: FirmwareAnalysisReport;
  capabilityReport: CapabilityReportEntry[];
}

export function analyzeFirmware(
  files: FirmwareFileData[],
  moduleStates?: PersistedModuleState[],
  activeRuntimeModules: string[] = []
): FullAnalysisOutput {
  const modules = moduleStates && moduleStates.length > 0 ? moduleStates : getDefaultPersistedModules();
  const moduleStateMap = new Map(modules.map((m) => [m.id, m]));

  const parsed = parseFirmwareProject(files);
  const diagnostics: DiagnosticMessage[] = [...parsed.diagnostics];

  const numericMacros = new Map<string, number>([
    ["LED_BUILTIN", 2],
    ["SDA", 21],
    ["SCL", 22],
  ]);

  const macrosList: FirmwareAnalysisReport["macros"] = [];
  for (const def of parsed.defines) {
    macrosList.push({
      name: def.name,
      value: def.value,
      file: def.file,
      line: def.line,
    });
    const clean = def.value.trim().replace(/[uUlLfF]+$/, "");
    if (/^-?(0x[0-9a-fA-F]+|\d+)$/.test(clean)) {
      numericMacros.set(def.name, clean.startsWith("0x") ? parseInt(clean, 16) : parseInt(clean, 10));
    }
  }

  const libraries = parsed.includes.map((inc) => ({
    name: inc.header,
    isLocal: inc.isLocal,
    resolved: !inc.isLocal || !parsed.missingSourceFiles.includes(inc.header),
    file: inc.file,
    line: inc.line,
  }));

  const functions: AnalyzedFunction[] = [];
  const variables: AnalyzedVariable[] = [];
  const enums: AnalyzedEnum[] = [];
  const classesAndStructs: AnalyzedStructOrClass[] = [];
  const gpioMap = new Map<string, GpioPinUsage>();

  // Track evidence per module
  const evidenceMap = new Map<string, DetectionEvidence[]>();
  for (const mod of HARDWARE_MODULES) {
    evidenceMap.set(mod.id, []);
  }

  const addEvidence = (moduleId: string, ev: DetectionEvidence) => {
    const arr = evidenceMap.get(moduleId);
    if (!arr) return;
    // Deduplicate same symbol on same line
    if (!arr.some((e) => e.file === ev.file && e.line === ev.line && e.symbol === ev.symbol)) {
      arr.push(ev);
    }
  };

  // Build quick lookup from library & symbol to modules
  for (const inc of parsed.includes) {
    for (const mod of HARDWARE_MODULES) {
      if (mod.detectionLibraries.some((lib) => lib.toLowerCase() === inc.header.toLowerCase())) {
        addEvidence(mod.id, {
          file: inc.file,
          line: inc.line,
          symbol: `#include <${inc.header}>`,
          context: "Library header include",
        });
      }
    }
  }

  // Track variable types so member calls like `display.fillCircle()` map to `Adafruit_SSD1306`
  const varTypeMap = new Map<string, string>();
  let estimatedRamBytes = 0;

  const inspectSymbol = (symbol: string, file: string, line: number, context: string) => {
    for (const mod of HARDWARE_MODULES) {
      if (
        mod.supportedApis.includes(symbol) ||
        mod.detectionSymbols.includes(symbol) ||
        mod.detectionSymbols.some((prefix) => prefix.endsWith("_") && symbol.startsWith(prefix))
      ) {
        addEvidence(mod.id, { file, line, symbol, context });
      }
    }
  };

  // Also check #define names (e.g. TOUCH_MAIN, BUZZER_PIN, BATTERY_PIN, MIC_PIN)
  for (const def of parsed.defines) {
    inspectSymbol(def.name, def.file, def.line, "#define constant");
  }

  const recordGpio = (pinExpr: Expression | undefined, op: string, file: string, line: number) => {
    if (!pinExpr) return;
    let pinLabel = "expr";
    if (pinExpr.kind === "NumberLiteral") pinLabel = `GPIO${pinExpr.value}`;
    else if (pinExpr.kind === "Identifier") pinLabel = pinExpr.name;
    const resolved = evalConstInt(pinExpr, numericMacros);
    const key = resolved !== null ? `GPIO${resolved}` : pinLabel;
    const existing = gpioMap.get(key);
    if (existing) {
      if (!existing.operations.includes(op)) existing.operations.push(op);
    } else {
      gpioMap.set(key, {
        pin: pinLabel,
        resolvedPin: resolved,
        operations: [op],
        file,
        line,
      });
    }
  };

  const walkExpr = (expr: Expression | null | undefined) => {
    if (!expr) return;
    switch (expr.kind) {
      case "Identifier":
        inspectSymbol(expr.name, expr.file, expr.line, "Identifier reference");
        break;
      case "ArrayInit":
        for (const el of expr.elements) walkExpr(el);
        break;
      case "UnaryExpr":
        walkExpr(expr.operand);
        break;
      case "CastExpr":
        walkExpr(expr.operand);
        break;
      case "BinaryExpr":
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case "AssignExpr":
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case "TernaryExpr":
        walkExpr(expr.condition);
        walkExpr(expr.consequent);
        walkExpr(expr.alternate);
        break;
      case "IndexExpr":
        walkExpr(expr.object);
        walkExpr(expr.index);
        break;
      case "MemberExpr": {
        walkExpr(expr.object);
        if (expr.object.kind === "Identifier") {
          const objName = expr.object.name;
          const fullName = `${objName}.${expr.property}`;
          inspectSymbol(fullName, expr.file, expr.line, "Member access");
          inspectSymbol(objName, expr.file, expr.line, "Object reference");
          const objType = varTypeMap.get(objName);
          if (objType) {
            inspectSymbol(objType, expr.file, expr.line, `Instance '${objName}' method .${expr.property}()`);
            if (objType === "Adafruit_SSD1306") {
              addEvidence("ssd1306_oled", {
                file: expr.file,
                line: expr.line,
                symbol: `${objName}.${expr.property}()`,
                context: "SSD1306 display draw/control call",
              });
            } else if (objType === "Preferences") {
              addEvidence("preferences_nvs", {
                file: expr.file,
                line: expr.line,
                symbol: `${objName}.${expr.property}()`,
                context: "Preferences NVS call",
              });
            } else if (objType === "Servo") {
              addEvidence("servo_pwm", {
                file: expr.file,
                line: expr.line,
                symbol: `${objName}.${expr.property}()`,
                context: "Servo actuator call",
              });
            } else if (objType === "MPU6050" || objType === "Adafruit_MPU6050") {
              addEvidence("imu_mpu6050", {
                file: expr.file,
                line: expr.line,
                symbol: `${objName}.${expr.property}()`,
                context: "IMU sensor call",
              });
            } else if (objType === "BluetoothSerial" || objType === "BLEServer") {
              addEvidence("bluetooth_ble", {
                file: expr.file,
                line: expr.line,
                symbol: `${objName}.${expr.property}()`,
                context: "Bluetooth / BLE call",
              });
            }
          }
        }
        inspectSymbol(expr.property, expr.file, expr.line, "Method call");
        break;
      }
      case "CallExpr": {
        walkExpr(expr.callee);
        for (const arg of expr.args) walkExpr(arg);

        // Extract direct call name for GPIO & special detection
        if (expr.callee.kind === "Identifier") {
          const fnName = expr.callee.name;
          inspectSymbol(fnName, expr.file, expr.line, "Function call");
          if (["pinMode", "digitalWrite", "digitalRead", "analogRead", "analogWrite"].includes(fnName)) {
            recordGpio(expr.args[0], fnName, expr.file, expr.line);
          }
          if (fnName === "touchRead") {
            recordGpio(expr.args[0], "touchRead", expr.file, expr.line);
          }
          if (fnName === "tone" || fnName === "noTone") {
            recordGpio(expr.args[0], fnName, expr.file, expr.line);
          }
          if (fnName === "analogReadMilliVolts") {
            recordGpio(expr.args[0], fnName, expr.file, expr.line);
          }
        }
        break;
      }
      default:
        break;
    }
  };

  const walkVarDecl = (decl: VarDecl, isGlobal: boolean) => {
    varTypeMap.set(decl.name, decl.varType);
    inspectSymbol(decl.varType, decl.file, decl.line, `Variable '${decl.name}' type`);

    // Check const numeric variables for GPIO resolution
    if (decl.isConst && decl.initializer) {
      const val = evalConstInt(decl.initializer, numericMacros);
      if (val !== null) numericMacros.set(decl.name, val);
    }

    let arrayLen: number | undefined;
    if (decl.isArray) {
      if (decl.arrayDimensions.length > 0 && decl.arrayDimensions[0]) {
        const len = evalConstInt(decl.arrayDimensions[0], numericMacros);
        if (len !== null) arrayLen = len;
      } else if (decl.initializer && decl.initializer.kind === "ArrayInit") {
        arrayLen = decl.initializer.elements.length;
      }
    }

    const elemBytes = estimateTypeBytes(decl.varType);
    const bytes = decl.isProgmem ? 0 : elemBytes * (arrayLen ?? 1);
    if (isGlobal) {
      estimatedRamBytes += bytes;
      variables.push({
        name: decl.name,
        type: decl.varType,
        isConst: decl.isConst,
        isArray: decl.isArray,
        arrayLength: arrayLen,
        file: decl.file,
        line: decl.line,
        estimatedBytes: bytes,
      });
    }

    if (decl.initializer) walkExpr(decl.initializer);
    if (decl.constructorArgs) {
      for (const arg of decl.constructorArgs) walkExpr(arg);
    }
  };

  const walkStmt = (stmt: Statement | null | undefined) => {
    if (!stmt) return;
    switch (stmt.kind) {
      case "BlockStmt":
        for (const s of stmt.statements) walkStmt(s);
        break;
      case "VarDecl":
        walkVarDecl(stmt, false);
        break;
      case "ExprStmt":
        walkExpr(stmt.expression);
        break;
      case "IfStmt":
        walkExpr(stmt.condition);
        walkStmt(stmt.thenBranch);
        walkStmt(stmt.elseBranch);
        break;
      case "WhileStmt":
        walkExpr(stmt.condition);
        walkStmt(stmt.body);
        break;
      case "DoWhileStmt":
        walkStmt(stmt.body);
        walkExpr(stmt.condition);
        break;
      case "ForStmt":
        walkStmt(stmt.init);
        walkExpr(stmt.condition);
        walkExpr(stmt.update);
        walkStmt(stmt.body);
        break;
      case "SwitchStmt":
        walkExpr(stmt.discriminant);
        for (const c of stmt.cases) {
          walkExpr(c.test);
          for (const s of c.consequent) walkStmt(s);
        }
        break;
      case "ReturnStmt":
        walkExpr(stmt.argument);
        break;
      default:
        break;
    }
  };

  const walkTopLevel = (decl: TopLevelDecl) => {
    switch (decl.kind) {
      case "EnumDecl": {
        let nextVal = 0;
        const memberNames: string[] = [];
        for (const m of decl.members) {
          memberNames.push(m.name);
          if (m.value) {
            const v = evalConstInt(m.value, numericMacros);
            if (v !== null) nextVal = v;
          }
          numericMacros.set(m.name, nextVal);
          nextVal++;
        }
        enums.push({
          name: decl.name,
          values: memberNames,
          file: decl.file,
          line: decl.line,
        });
        break;
      }
      case "StructOrClassDecl": {
        classesAndStructs.push({
          kind: decl.structKind,
          name: decl.name,
          fields: decl.fields.map((f) => `${f.varType} ${f.name}`),
          methods: decl.methods.map((m) => m.name),
          file: decl.file,
          line: decl.line,
        });
        for (const m of decl.methods) {
          if (m.body) walkStmt(m.body);
        }
        break;
      }
      case "VarDecl":
        walkVarDecl(decl, true);
        break;
      case "FunctionDecl":
        functions.push({
          name: decl.name,
          returnType: decl.returnType,
          params: decl.params.map((p) => `${p.paramType} ${p.name}`.trim()),
          file: decl.file,
          line: decl.line,
          hasBody: decl.body !== null,
        });
        if (decl.name === "setup" || decl.name === "loop") {
          addEvidence("esp32_mcu", {
            file: decl.file,
            line: decl.line,
            symbol: `${decl.name}()`,
            context: "Arduino entry point",
          });
        }
        if (decl.body) walkStmt(decl.body);
        break;
      default:
        break;
    }
  };

  for (const decl of parsed.declarations) {
    walkTopLevel(decl);
  }

  const hasSetup = functions.some((f) => f.name === "setup" && f.hasBody);
  const hasLoop = functions.some((f) => f.name === "loop" && f.hasBody);

  if (files.length > 0 && !hasSetup) {
    diagnostics.push({
      id: "semantic_missing_setup",
      severity: "error",
      category: "semantic",
      file: files[0].path,
      line: 1,
      column: 1,
      message: "Required Arduino entry point 'void setup()' was not found.",
      suggestion: "Define 'void setup() { ... }' in your main .ino or .cpp file.",
    });
  }
  if (files.length > 0 && !hasLoop) {
    diagnostics.push({
      id: "semantic_missing_loop",
      severity: "error",
      category: "semantic",
      file: files[0].path,
      line: 1,
      column: 1,
      message: "Required Arduino entry point 'void loop()' was not found.",
      suggestion: "Define 'void loop() { ... }' in your main .ino or .cpp file.",
    });
  }

  // If SSD1306 detected, add 1024 bytes framebuffer RAM estimate
  const oledDetected = (evidenceMap.get("ssd1306_oled")?.length ?? 0) > 0;
  if (oledDetected) {
    estimatedRamBytes += 1024;
  }

  // Build Capability Report across ALL registered hardware modules
  const capabilityReport: CapabilityReportEntry[] = [];
  const hardwareDependencies: string[] = [];

  for (const mod of HARDWARE_MODULES) {
    const ev = evidenceMap.get(mod.id) ?? [];
    const detected = ev.length > 0;
    const state = moduleStateMap.get(mod.id);
    const enabled = state ? state.enabled : mod.defaultEnabled;
    const supportLevel = state ? state.supportLevel : mod.defaultSupportLevel;
    const isExtended = state ? state.isExtended : false;

    if (detected) {
      hardwareDependencies.push(mod.name);
      if (!enabled || supportLevel === "UNSUPPORTED") {
        diagnostics.push({
          id: `cap_unsupported_${mod.id}`,
          severity: "warning",
          category: "unsupported",
          file: ev[0].file,
          line: ev[0].line,
          column: 1,
          message: `Firmware uses '${mod.name}' (${ev[0].symbol}), which is currently ${supportLevel.replace("_", " ")} in the simulator.`,
          suggestion: mod.possibleSolution,
        });
      } else if (supportLevel === "PARTIALLY_SUPPORTED") {
        diagnostics.push({
          id: `cap_partial_${mod.id}`,
          severity: "info",
          category: "hardware",
          file: ev[0].file,
          line: ev[0].line,
          column: 1,
          message: `'${mod.name}' is PARTIALLY SUPPORTED: ${mod.limitations[0] ?? "See Capability Center for limitations."}`,
        });
      }
    }

    const isRuntimeActive = activeRuntimeModules.includes(mod.id);
    const runtimeStatus: CapabilityReportEntry["runtimeStatus"] = !detected
      ? "INACTIVE"
      : isRuntimeActive
      ? "ACTIVE"
      : enabled
      ? "READY"
      : "INACTIVE";

    const missingFunctionality =
      !enabled || supportLevel !== "SUPPORTED"
        ? detected
          ? Array.from(new Set(ev.map((e) => e.symbol))).slice(0, 8)
          : mod.supportedApis.slice(0, 5)
        : [];

    const canImplementSupport =
      supportLevel !== "SUPPORTED" &&
      (mod.browserSimulatable === "FULL" ||
        (mod.browserSimulatable === "PARTIAL" && !enabled) ||
        mod.browserSimulatable === "IMPOSSIBLE");

    capabilityReport.push({
      moduleId: mod.id,
      featureName: mod.name,
      category: mod.category,
      detected,
      detectionEvidence: ev,
      simulatorSupport: supportLevel,
      implementationStatus: !detected
        ? "NOT_DETECTED"
        : enabled
        ? supportLevel
        : "UNSUPPORTED",
      runtimeStatus,
      requiredHardware: mod.requiredHardware,
      missingFunctionality,
      explanation: enabled ? mod.description : mod.missingExplanation,
      possibleSolution: enabled
        ? supportLevel === "PARTIALLY_SUPPORTED"
          ? `Active with documented browser limitations. ${mod.limitations[0] ?? ""}`
          : "Module active and ready for simulation."
        : mod.possibleSolution,
      browserSimulatable: mod.browserSimulatable,
      limitations: mod.limitations,
      canImplementSupport,
      isExtended,
    });
  }

  const syntaxErrors = diagnostics.filter(
    (d) => d.severity === "error" && (d.category === "syntax" || d.category === "missing_dependency")
  );
  const canExecute = files.length > 0 && hasSetup && hasLoop && syntaxErrors.length === 0;
  const estimatedSourceBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);

  const detectedCount = capabilityReport.filter((c) => c.detected).length;
  const unsupportedDetectedCount = capabilityReport.filter(
    (c) => c.detected && c.simulatorSupport === "UNSUPPORTED"
  ).length;
  const partialDetectedCount = capabilityReport.filter(
    (c) => c.detected && c.simulatorSupport === "PARTIALLY_SUPPORTED"
  ).length;

  const summary =
    files.length === 0
      ? "No firmware files imported."
      : canExecute
      ? `Parsed ${files.length} file(s) (${parsed.totalLines} lines). Detected ${detectedCount} hardware feature(s): ${
          detectedCount - unsupportedDetectedCount - partialDetectedCount
        } supported, ${partialDetectedCount} partial, ${unsupportedDetectedCount} unsupported. Ready to build & execute supported subset.`
      : `Analysis found ${syntaxErrors.length} blocking syntax/dependency error(s)${
          !hasSetup || !hasLoop ? " or missing setup()/loop()" : ""
        }. Resolve errors before running simulation.`;

  const analysisReport: FirmwareAnalysisReport = {
    analyzedAt: new Date().toISOString(),
    fileCount: files.length,
    hasSetup,
    hasLoop,
    libraries,
    macros: macrosList,
    functions,
    variables,
    enums,
    classesAndStructs,
    gpioUsage: Array.from(gpioMap.values()),
    hardwareDependencies,
    estimatedRamBytes,
    estimatedSourceBytes,
    memoryEstimationNote:
      "Static AST estimate of global variables + OLED framebuffer only. Not an actual xtensa-esp32-elf-gcc linker report.",
    classification: {
      totalLines: parsed.totalLines,
      successfullyParsedNodes: parsed.successfullyParsedNodes,
      recognizedUnsupportedNodes: parsed.recognizedUnsupportedNodes,
      unrecognizedNodes: 0,
      invalidSyntaxNodes: parsed.invalidSyntaxNodes,
      missingSourceFiles: parsed.missingSourceFiles,
    },
    diagnostics,
    canExecute,
    summary,
  };

  return { analysisReport, capabilityReport };
}
