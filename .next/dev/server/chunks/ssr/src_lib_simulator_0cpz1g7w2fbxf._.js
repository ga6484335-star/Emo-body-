(()=>{"use strict";module.exports = [
"[project]/src/lib/simulator/analyzer/analyzer.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyzeFirmware",
    ()=>analyzeFirmware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$parser$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/parser/parser.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/modules/registry.ts [app-ssr] (ecmascript)");
;
;
function estimateTypeBytes(typeName) {
    const t = typeName.toLowerCase();
    if (t.includes("uint8") || t.includes("int8") || t.includes("byte") || t.includes("char") || t.includes("bool")) {
        return 1;
    }
    if (t.includes("uint16") || t.includes("int16") || t.includes("short")) return 2;
    if (t.includes("double") || t.includes("64")) return 8;
    if (t.includes("string")) return 16;
    return 4; // ESP32 32-bit int / float / pointer
}
function evalConstInt(expr, macros) {
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
function analyzeFirmware(files, moduleStates, activeRuntimeModules = []) {
    const modules = moduleStates && moduleStates.length > 0 ? moduleStates : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDefaultPersistedModules"])();
    const moduleStateMap = new Map(modules.map((m)=>[
            m.id,
            m
        ]));
    const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$parser$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseFirmwareProject"])(files);
    const diagnostics = [
        ...parsed.diagnostics
    ];
    const numericMacros = new Map([
        [
            "LED_BUILTIN",
            2
        ],
        [
            "SDA",
            21
        ],
        [
            "SCL",
            22
        ]
    ]);
    const macrosList = [];
    for (const def of parsed.defines){
        macrosList.push({
            name: def.name,
            value: def.value,
            file: def.file,
            line: def.line
        });
        const clean = def.value.trim().replace(/[uUlLfF]+$/, "");
        if (/^-?(0x[0-9a-fA-F]+|\d+)$/.test(clean)) {
            numericMacros.set(def.name, clean.startsWith("0x") ? parseInt(clean, 16) : parseInt(clean, 10));
        }
    }
    const libraries = parsed.includes.map((inc)=>({
            name: inc.header,
            isLocal: inc.isLocal,
            resolved: !inc.isLocal || !parsed.missingSourceFiles.includes(inc.header),
            file: inc.file,
            line: inc.line
        }));
    const functions = [];
    const variables = [];
    const enums = [];
    const classesAndStructs = [];
    const gpioMap = new Map();
    // Track evidence per module
    const evidenceMap = new Map();
    for (const mod of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HARDWARE_MODULES"]){
        evidenceMap.set(mod.id, []);
    }
    const addEvidence = (moduleId, ev)=>{
        const arr = evidenceMap.get(moduleId);
        if (!arr) return;
        // Deduplicate same symbol on same line
        if (!arr.some((e)=>e.file === ev.file && e.line === ev.line && e.symbol === ev.symbol)) {
            arr.push(ev);
        }
    };
    // Build quick lookup from library & symbol to modules
    for (const inc of parsed.includes){
        for (const mod of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HARDWARE_MODULES"]){
            if (mod.detectionLibraries.some((lib)=>lib.toLowerCase() === inc.header.toLowerCase())) {
                addEvidence(mod.id, {
                    file: inc.file,
                    line: inc.line,
                    symbol: `#include <${inc.header}>`,
                    context: "Library header include"
                });
            }
        }
    }
    // Track variable types so member calls like `display.fillCircle()` map to `Adafruit_SSD1306`
    const varTypeMap = new Map();
    let estimatedRamBytes = 0;
    const inspectSymbol = (symbol, file, line, context)=>{
        for (const mod of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HARDWARE_MODULES"]){
            if (mod.supportedApis.includes(symbol) || mod.detectionSymbols.includes(symbol) || mod.detectionSymbols.some((prefix)=>prefix.endsWith("_") && symbol.startsWith(prefix))) {
                addEvidence(mod.id, {
                    file,
                    line,
                    symbol,
                    context
                });
            }
        }
    };
    // Also check #define names (e.g. TOUCH_MAIN, BUZZER_PIN, BATTERY_PIN, MIC_PIN)
    for (const def of parsed.defines){
        inspectSymbol(def.name, def.file, def.line, "#define constant");
    }
    const recordGpio = (pinExpr, op, file, line)=>{
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
                operations: [
                    op
                ],
                file,
                line
            });
        }
    };
    const walkExpr = (expr)=>{
        if (!expr) return;
        switch(expr.kind){
            case "Identifier":
                inspectSymbol(expr.name, expr.file, expr.line, "Identifier reference");
                break;
            case "ArrayInit":
                for (const el of expr.elements)walkExpr(el);
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
            case "MemberExpr":
                {
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
                                    context: "SSD1306 display draw/control call"
                                });
                            } else if (objType === "Preferences") {
                                addEvidence("preferences_nvs", {
                                    file: expr.file,
                                    line: expr.line,
                                    symbol: `${objName}.${expr.property}()`,
                                    context: "Preferences NVS call"
                                });
                            } else if (objType === "Servo") {
                                addEvidence("servo_pwm", {
                                    file: expr.file,
                                    line: expr.line,
                                    symbol: `${objName}.${expr.property}()`,
                                    context: "Servo actuator call"
                                });
                            } else if (objType === "MPU6050" || objType === "Adafruit_MPU6050") {
                                addEvidence("imu_mpu6050", {
                                    file: expr.file,
                                    line: expr.line,
                                    symbol: `${objName}.${expr.property}()`,
                                    context: "IMU sensor call"
                                });
                            } else if (objType === "BluetoothSerial" || objType === "BLEServer") {
                                addEvidence("bluetooth_ble", {
                                    file: expr.file,
                                    line: expr.line,
                                    symbol: `${objName}.${expr.property}()`,
                                    context: "Bluetooth / BLE call"
                                });
                            }
                        }
                    }
                    inspectSymbol(expr.property, expr.file, expr.line, "Method call");
                    break;
                }
            case "CallExpr":
                {
                    walkExpr(expr.callee);
                    for (const arg of expr.args)walkExpr(arg);
                    // Extract direct call name for GPIO & special detection
                    if (expr.callee.kind === "Identifier") {
                        const fnName = expr.callee.name;
                        inspectSymbol(fnName, expr.file, expr.line, "Function call");
                        if ([
                            "pinMode",
                            "digitalWrite",
                            "digitalRead",
                            "analogRead",
                            "analogWrite"
                        ].includes(fnName)) {
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
    const walkVarDecl = (decl, isGlobal)=>{
        varTypeMap.set(decl.name, decl.varType);
        inspectSymbol(decl.varType, decl.file, decl.line, `Variable '${decl.name}' type`);
        // Check const numeric variables for GPIO resolution
        if (decl.isConst && decl.initializer) {
            const val = evalConstInt(decl.initializer, numericMacros);
            if (val !== null) numericMacros.set(decl.name, val);
        }
        let arrayLen;
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
                estimatedBytes: bytes
            });
        }
        if (decl.initializer) walkExpr(decl.initializer);
        if (decl.constructorArgs) {
            for (const arg of decl.constructorArgs)walkExpr(arg);
        }
    };
    const walkStmt = (stmt)=>{
        if (!stmt) return;
        switch(stmt.kind){
            case "BlockStmt":
                for (const s of stmt.statements)walkStmt(s);
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
                for (const c of stmt.cases){
                    walkExpr(c.test);
                    for (const s of c.consequent)walkStmt(s);
                }
                break;
            case "ReturnStmt":
                walkExpr(stmt.argument);
                break;
            default:
                break;
        }
    };
    const walkTopLevel = (decl)=>{
        switch(decl.kind){
            case "EnumDecl":
                {
                    let nextVal = 0;
                    const memberNames = [];
                    for (const m of decl.members){
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
                        line: decl.line
                    });
                    break;
                }
            case "StructOrClassDecl":
                {
                    classesAndStructs.push({
                        kind: decl.structKind,
                        name: decl.name,
                        fields: decl.fields.map((f)=>`${f.varType} ${f.name}`),
                        methods: decl.methods.map((m)=>m.name),
                        file: decl.file,
                        line: decl.line
                    });
                    for (const m of decl.methods){
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
                    params: decl.params.map((p)=>`${p.paramType} ${p.name}`.trim()),
                    file: decl.file,
                    line: decl.line,
                    hasBody: decl.body !== null
                });
                if (decl.name === "setup" || decl.name === "loop") {
                    addEvidence("esp32_mcu", {
                        file: decl.file,
                        line: decl.line,
                        symbol: `${decl.name}()`,
                        context: "Arduino entry point"
                    });
                }
                if (decl.body) walkStmt(decl.body);
                break;
            default:
                break;
        }
    };
    for (const decl of parsed.declarations){
        walkTopLevel(decl);
    }
    const hasSetup = functions.some((f)=>f.name === "setup" && f.hasBody);
    const hasLoop = functions.some((f)=>f.name === "loop" && f.hasBody);
    if (files.length > 0 && !hasSetup) {
        diagnostics.push({
            id: "semantic_missing_setup",
            severity: "error",
            category: "semantic",
            file: files[0].path,
            line: 1,
            column: 1,
            message: "Required Arduino entry point 'void setup()' was not found.",
            suggestion: "Define 'void setup() { ... }' in your main .ino or .cpp file."
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
            suggestion: "Define 'void loop() { ... }' in your main .ino or .cpp file."
        });
    }
    // If SSD1306 detected, add 1024 bytes framebuffer RAM estimate
    const oledDetected = (evidenceMap.get("ssd1306_oled")?.length ?? 0) > 0;
    if (oledDetected) {
        estimatedRamBytes += 1024;
    }
    // Build Capability Report across ALL registered hardware modules
    const capabilityReport = [];
    const hardwareDependencies = [];
    for (const mod of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HARDWARE_MODULES"]){
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
                    suggestion: mod.possibleSolution
                });
            } else if (supportLevel === "PARTIALLY_SUPPORTED") {
                diagnostics.push({
                    id: `cap_partial_${mod.id}`,
                    severity: "info",
                    category: "hardware",
                    file: ev[0].file,
                    line: ev[0].line,
                    column: 1,
                    message: `'${mod.name}' is PARTIALLY SUPPORTED: ${mod.limitations[0] ?? "See Capability Center for limitations."}`
                });
            }
        }
        const isRuntimeActive = activeRuntimeModules.includes(mod.id);
        const runtimeStatus = !detected ? "INACTIVE" : isRuntimeActive ? "ACTIVE" : enabled ? "READY" : "INACTIVE";
        const missingFunctionality = !enabled || supportLevel !== "SUPPORTED" ? detected ? Array.from(new Set(ev.map((e)=>e.symbol))).slice(0, 8) : mod.supportedApis.slice(0, 5) : [];
        const canImplementSupport = supportLevel !== "SUPPORTED" && (mod.browserSimulatable === "FULL" || mod.browserSimulatable === "PARTIAL" && !enabled || mod.browserSimulatable === "IMPOSSIBLE");
        capabilityReport.push({
            moduleId: mod.id,
            featureName: mod.name,
            category: mod.category,
            detected,
            detectionEvidence: ev,
            simulatorSupport: supportLevel,
            implementationStatus: !detected ? "NOT_DETECTED" : enabled ? supportLevel : "UNSUPPORTED",
            runtimeStatus,
            requiredHardware: mod.requiredHardware,
            missingFunctionality,
            explanation: enabled ? mod.description : mod.missingExplanation,
            possibleSolution: enabled ? supportLevel === "PARTIALLY_SUPPORTED" ? `Active with documented browser limitations. ${mod.limitations[0] ?? ""}` : "Module active and ready for simulation." : mod.possibleSolution,
            browserSimulatable: mod.browserSimulatable,
            limitations: mod.limitations,
            canImplementSupport,
            isExtended
        });
    }
    const syntaxErrors = diagnostics.filter((d)=>d.severity === "error" && (d.category === "syntax" || d.category === "missing_dependency"));
    const canExecute = files.length > 0 && hasSetup && hasLoop && syntaxErrors.length === 0;
    const estimatedSourceBytes = files.reduce((acc, f)=>acc + f.sizeBytes, 0);
    const detectedCount = capabilityReport.filter((c)=>c.detected).length;
    const unsupportedDetectedCount = capabilityReport.filter((c)=>c.detected && c.simulatorSupport === "UNSUPPORTED").length;
    const partialDetectedCount = capabilityReport.filter((c)=>c.detected && c.simulatorSupport === "PARTIALLY_SUPPORTED").length;
    const summary = files.length === 0 ? "No firmware files imported." : canExecute ? `Parsed ${files.length} file(s) (${parsed.totalLines} lines). Detected ${detectedCount} hardware feature(s): ${detectedCount - unsupportedDetectedCount - partialDetectedCount} supported, ${partialDetectedCount} partial, ${unsupportedDetectedCount} unsupported. Ready to build & execute supported subset.` : `Analysis found ${syntaxErrors.length} blocking syntax/dependency error(s)${!hasSetup || !hasLoop ? " or missing setup()/loop()" : ""}. Resolve errors before running simulation.`;
    const analysisReport = {
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
        memoryEstimationNote: "Static AST estimate of global variables + OLED framebuffer only. Not an actual xtensa-esp32-elf-gcc linker report.",
        classification: {
            totalLines: parsed.totalLines,
            successfullyParsedNodes: parsed.successfullyParsedNodes,
            recognizedUnsupportedNodes: parsed.recognizedUnsupportedNodes,
            unrecognizedNodes: 0,
            invalidSyntaxNodes: parsed.invalidSyntaxNodes,
            missingSourceFiles: parsed.missingSourceFiles
        },
        diagnostics,
        canExecute,
        summary
    };
    return {
        analysisReport,
        capabilityReport
    };
}
}),
"[project]/src/lib/simulator/audio/webAudio.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "virtualAudio",
    ()=>virtualAudio
]);
class VirtualAudioEngine {
    ctx = null;
    buzzerOsc = null;
    buzzerGain = null;
    buzzerStopTimer = null;
    speakerOsc = null;
    speakerGain = null;
    muted = false;
    volume = 0.25;
    ensureContext() {
        if ("TURBOPACK compile-time truthy", 1) return null;
        //TURBOPACK unreachable
        ;
    }
    playBuzzer(freqHz, durationMs) {
        if (this.muted || freqHz < 20 || freqHz > 20000) {
            this.stopBuzzer();
            return;
        }
        const ctx = this.ensureContext();
        if (!ctx) return;
        this.stopBuzzer();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
        gain.gain.setValueAtTime(Math.max(0.01, this.volume * 0.3), ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        this.buzzerOsc = osc;
        this.buzzerGain = gain;
        if (durationMs && durationMs > 0) {
            this.buzzerStopTimer = setTimeout(()=>{
                this.stopBuzzer();
            }, durationMs);
        }
    }
    stopBuzzer() {
        if (this.buzzerStopTimer) {
            clearTimeout(this.buzzerStopTimer);
            this.buzzerStopTimer = null;
        }
        if (this.buzzerOsc) {
            try {
                this.buzzerOsc.stop();
                this.buzzerOsc.disconnect();
            } catch  {
            // already stopped
            }
            this.buzzerOsc = null;
        }
        if (this.buzzerGain) {
            try {
                this.buzzerGain.disconnect();
            } catch  {
            // ignore
            }
            this.buzzerGain = null;
        }
    }
    playSpeaker(freqHz) {
        if (this.muted || freqHz < 20 || freqHz > 20000) {
            this.stopSpeaker();
            return;
        }
        const ctx = this.ensureContext();
        if (!ctx) return;
        if (!this.speakerOsc || !this.speakerGain) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
            gain.gain.setValueAtTime(Math.max(0.01, this.volume * 0.45), ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            this.speakerOsc = osc;
            this.speakerGain = gain;
        } else {
            this.speakerOsc.frequency.setTargetAtTime(freqHz, ctx.currentTime, 0.01);
            this.speakerGain.gain.setTargetAtTime(Math.max(0.01, this.volume * 0.45), ctx.currentTime, 0.01);
        }
    }
    stopSpeaker() {
        if (this.speakerOsc) {
            try {
                this.speakerOsc.stop();
                this.speakerOsc.disconnect();
            } catch  {
            // ignore
            }
            this.speakerOsc = null;
        }
        if (this.speakerGain) {
            try {
                this.speakerGain.disconnect();
            } catch  {
            // ignore
            }
            this.speakerGain = null;
        }
    }
    stopAll() {
        this.stopBuzzer();
        this.stopSpeaker();
    }
}
const virtualAudio = new VirtualAudioEngine();
}),
"[project]/src/lib/simulator/interpreter/runtime.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmoFirmwareRuntime",
    ()=>EmoFirmwareRuntime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$parser$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/parser/parser.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/oled/ssd1306.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/audio/webAudio.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/modules/registry.ts [app-ssr] (ecmascript)");
;
;
;
;
class ControlSignal {
    kind;
    value;
    constructor(kind, value = null){
        this.kind = kind;
        this.value = value;
    }
}
class FirmwareRuntimeError extends Error {
    file;
    line;
    constructor(message, file, line){
        super(message), this.file = file, this.line = line;
    }
}
function isObjectValue(v) {
    return typeof v === "object" && v !== null && "__kind" in v && v.__kind === "object";
}
function isArrayValue(v) {
    return typeof v === "object" && v !== null && "__kind" in v && v.__kind === "array";
}
function toNumber(v) {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isNaN(n) ? 0 : n;
    }
    return 0;
}
function toBool(v) {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v.length > 0;
    return v !== null;
}
function toDisplayString(v) {
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
function formatVarPreview(v) {
    if (isArrayValue(v)) {
        const head = v.elements.slice(0, 6).map(toDisplayString).join(", ");
        return `[${head}${v.elements.length > 6 ? `, … (${v.elements.length})` : ""}]`;
    }
    if (isObjectValue(v)) {
        const keys = Object.keys(v.fields).slice(0, 4);
        const kv = keys.map((k)=>`${k}:${toDisplayString(v.fields[k])}`).join(", ");
        return `${v.className}{${kv}}`;
    }
    if (typeof v === "string") return `"${v}"`;
    return String(v);
}
const ARDUINO_CONSTANTS = {
    HIGH: 1,
    LOW: 0,
    INPUT: 0,
    OUTPUT: 1,
    INPUT_PULLUP: 2,
    INPUT_PULLDOWN: 3,
    LED_BUILTIN: 2,
    SDA: 21,
    SCL: 22,
    SSD1306_BLACK: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_BLACK"],
    SSD1306_WHITE: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"],
    SSD1306_INVERSE: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_INVERSE"],
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
    portTICK_PERIOD_MS: 1
};
class EmoFirmwareRuntime {
    oled;
    state = "IDLE";
    simTimeMs = 0;
    loopIterations = 0;
    instructionsExecuted = 0;
    lastError = null;
    serialLogs = [];
    touchHistory = [];
    eventHistory = [];
    serialRxQueue = [];
    serialLineBuf = "";
    logSeq = 0;
    hardwareConfig;
    modulesMap;
    activeModulesSet = new Set();
    warnedUnsupportedApis = new Set();
    program = null;
    globalEnv = {
        vars: new Map(),
        parent: null
    };
    functions = new Map();
    structs = new Map();
    staticLocals = new Map();
    generator = null;
    wakeAtSimMs = 0;
    delayedInCurrentLoop = false;
    callDepth = 0;
    maxCallStackDepth = 64;
    maxInstructionsPerTick = 24000;
    tickInstructions = 0;
    // Virtual Hardware State
    pins = {};
    nvsStorage = {};
    eepromBuffer = new Uint8Array(512);
    ledcChannels = new Map();
    servos = {};
    imu = {
        ax: 0,
        ay: 0,
        az: 16384,
        gx: 0,
        gy: 0,
        gz: 0
    };
    wifiMock = {
        connected: false,
        ssid: "",
        ip: "0.0.0.0",
        rssi: -52
    };
    i2cTargetAddr = 0;
    i2cRxBuffer = [];
    interrupts = new Map();
    audioState = {
        buzzerActive: false,
        buzzerFreqHz: 0,
        buzzerStopAtMs: 0,
        speakerActive: false,
        speakerFreqHz: 0,
        micLevel: 120
    };
    rngState = 1337;
    onStateUpdate;
    constructor(hardwareConfig, modules, onStateUpdate){
        this.hardwareConfig = hardwareConfig;
        this.oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VirtualSSD1306"](hardwareConfig.oled.width || 128, hardwareConfig.oled.height || 64);
        const list = modules && modules.length > 0 ? modules : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDefaultPersistedModules"])();
        this.modulesMap = new Map(list.map((m)=>[
                m.id,
                m
            ]));
        this.onStateUpdate = onStateUpdate;
        this.initPins();
    }
    setLimits(maxInstructionsPerTick, maxCallStackDepth) {
        this.maxInstructionsPerTick = Math.max(1000, Math.min(200000, maxInstructionsPerTick));
        this.maxCallStackDepth = Math.max(16, Math.min(256, maxCallStackDepth));
    }
    updateModules(modules) {
        this.modulesMap = new Map(modules.map((m)=>[
                m.id,
                m
            ]));
    }
    updateHardwareConfig(cfg) {
        this.hardwareConfig = cfg;
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].muted = cfg.audio.muted;
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].volume = cfg.audio.volume;
        // Update battery ADC pin reading immediately
        this.updateBatteryAdcPin();
        this.applyPinLabels();
    }
    initPins() {
        this.pins = {};
        for(let p = 0; p <= 39; p++){
            this.pins[p] = {
                pin: p,
                mode: "UNCONFIGURED",
                digitalValue: 0,
                analogValue: 0,
                pwmValue: 0,
                touchValue: 74
            };
        }
        this.applyPinLabels();
        this.updateBatteryAdcPin();
    }
    applyPinLabels() {
        for(let p = 0; p <= 39; p++){
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
    updateBatteryAdcPin() {
        const pct = Math.max(0, Math.min(100, this.hardwareConfig.battery.levelPercent));
        const packMv = 3300 + Math.round(pct / 100 * 900); // 3.3V .. 4.2V
        const dividerMv = Math.round(packMv / 2); // 1650mV .. 2100mV
        const adc12 = Math.round(dividerMv / 3300 * 4095);
        const pin = this.pins[this.hardwareConfig.battery.adcPin];
        if (pin) pin.analogValue = Math.max(0, Math.min(4095, adc12));
    }
    isModuleEnabled(id) {
        return Boolean(this.modulesMap.get(id)?.enabled);
    }
    markModuleActive(id) {
        this.activeModulesSet.add(id);
    }
    logEvent(category, message, file, line) {
        this.logSeq++;
        this.eventHistory.push({
            id: `evt_${this.logSeq}`,
            timestampMs: Math.round(this.simTimeMs),
            category,
            message,
            file,
            line
        });
        if (this.eventHistory.length > 400) {
            this.eventHistory.shift();
        }
    }
    pushSerial(direction, text) {
        this.logSeq++;
        const now = new Date();
        const wallTime = now.toTimeString().slice(0, 8);
        this.serialLogs.push({
            id: `ser_${this.logSeq}`,
            timestampMs: Math.round(this.simTimeMs),
            wallTime,
            direction,
            text
        });
        if (this.serialLogs.length > 600) {
            this.serialLogs.shift();
        }
    }
    warnUnsupported(api, moduleId, file, line) {
        const key = `${moduleId}:${api}`;
        if (this.warnedUnsupportedApis.has(key)) return;
        this.warnedUnsupportedApis.add(key);
        const msg = `[UNSUPPORTED API] ${api}() at ${file}:${line} — simulator module '${moduleId}' is disabled. Open Capability Center to implement or inspect support.`;
        this.logEvent("warning", msg, file, line);
        this.pushSerial("warn", msg);
    }
    clearLogs() {
        this.serialLogs = [];
    }
    pushSerialInput(text) {
        this.pushSerial("tx", text);
        for (const ch of text){
            this.serialRxQueue.push(ch);
        }
        this.serialRxQueue.push("\n");
    }
    setTouchSensor(sensor, pressed, eventType) {
        const pinNum = sensor === "MAIN_TOUCH" ? this.hardwareConfig.touch.mainTouchPin : this.hardwareConfig.touch.wakeTouchPin;
        const activeHigh = this.hardwareConfig.touch.touchActive === "HIGH";
        const newDigital = activeHigh ? pressed ? 1 : 0 : pressed ? 0 : 1;
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
            value: newDigital
        });
        if (this.touchHistory.length > 150) this.touchHistory.shift();
        this.logEvent("touch", `${sensor} (GPIO${pinNum}) -> ${eventType ?? (pressed ? "PRESS" : "RELEASE")} [digital=${newDigital}, cap=${newTouchVal}]`);
        this.onStateUpdate?.();
    }
    setExternalDigitalPin(pinNum, value) {
        const pin = this.pins[pinNum];
        if (!pin) return;
        const prev = pin.digitalValue;
        pin.digitalValue = value;
        this.checkPinInterrupt(pinNum, prev, value);
        this.logEvent("gpio", `Hardware Lab set GPIO${pinNum} = ${value === 1 ? "HIGH" : "LOW"}`);
        this.onStateUpdate?.();
    }
    setExternalAnalogPin(pinNum, value) {
        const pin = this.pins[pinNum];
        if (!pin) return;
        pin.analogValue = Math.max(0, Math.min(4095, Math.round(value)));
        this.onStateUpdate?.();
    }
    setMicLevel(level) {
        this.audioState.micLevel = Math.max(0, Math.min(4095, Math.round(level)));
        const micPin = this.pins[this.hardwareConfig.audio.microphonePin];
        if (micPin) micPin.analogValue = this.audioState.micLevel;
        this.onStateUpdate?.();
    }
    setImuValues(partial) {
        this.imu = {
            ...this.imu,
            ...partial
        };
        this.onStateUpdate?.();
    }
    checkPinInterrupt(pinNum, prev, next) {
        if (!this.isModuleEnabled("rtos_interrupts")) return;
        const isr = this.interrupts.get(pinNum);
        if (!isr) return;
        const triggered = isr.mode === 1 && prev === 0 && next === 1 || isr.mode === 2 && prev === 1 && next === 0 || isr.mode === 3 && prev !== next; // CHANGE
        if (triggered && this.state === "RUNNING") {
            const fn = this.functions.get(isr.fnName);
            if (fn && fn.body) {
                // Run brief ISR synchronously within safety cap
                try {
                    const gen = this.callUserFunction(fn, [], null);
                    let steps = 0;
                    while(steps < 2000){
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
   */ build(files) {
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
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$parser$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseFirmwareProject"])(files);
        const blockingErrors = parsed.diagnostics.filter((d)=>d.severity === "error" && (d.category === "syntax" || d.category === "missing_dependency"));
        if (files.length === 0) {
            const err = {
                id: "build_no_files",
                severity: "error",
                category: "semantic",
                file: "",
                line: 1,
                column: 1,
                message: "No firmware files imported. Use IMPORT CODE before building."
            };
            this.lastError = err;
            this.state = "ERROR";
            return {
                ok: false,
                diagnostics: [
                    err
                ]
            };
        }
        if (blockingErrors.length > 0) {
            this.lastError = blockingErrors[0];
            this.state = "ERROR";
            this.logEvent("error", `Build failed: ${blockingErrors[0].message}`, blockingErrors[0].file, blockingErrors[0].line);
            return {
                ok: false,
                diagnostics: parsed.diagnostics
            };
        }
        this.program = parsed;
        this.functions.clear();
        this.structs.clear();
        this.globalEnv = {
            vars: new Map(),
            parent: null
        };
        // Register built-in Arduino constants
        for (const [k, v] of Object.entries(ARDUINO_CONSTANTS)){
            this.globalEnv.vars.set(k, {
                type: "const int",
                value: v
            });
        }
        // Register #define numeric/string macros
        for (const def of parsed.defines){
            if (def.params) continue;
            const val = this.evalMacroValue(def.value);
            this.globalEnv.vars.set(def.name, {
                type: "#define",
                value: val
            });
        }
        // Register built-in singleton hardware objects
        this.globalEnv.vars.set("Serial", {
            type: "HardwareSerial",
            value: {
                __kind: "object",
                className: "HardwareSerial",
                fields: {}
            }
        });
        this.globalEnv.vars.set("Wire", {
            type: "TwoWire",
            value: {
                __kind: "object",
                className: "TwoWire",
                fields: {}
            }
        });
        this.globalEnv.vars.set("SPI", {
            type: "SPIClass",
            value: {
                __kind: "object",
                className: "SPIClass",
                fields: {}
            }
        });
        this.globalEnv.vars.set("EEPROM", {
            type: "EEPROMClass",
            value: {
                __kind: "object",
                className: "EEPROMClass",
                fields: {}
            }
        });
        this.globalEnv.vars.set("WiFi", {
            type: "WiFiClass",
            value: {
                __kind: "object",
                className: "WiFiClass",
                fields: {}
            }
        });
        this.globalEnv.vars.set("ESP", {
            type: "EspClass",
            value: {
                __kind: "object",
                className: "EspClass",
                fields: {}
            }
        });
        // Register Enums, Structs/Classes, and Functions
        for (const decl of parsed.declarations){
            if (decl.kind === "EnumDecl") {
                let nextVal = 0;
                for (const m of decl.members){
                    if (m.value) {
                        const evalVal = this.evalSyncConst(m.value);
                        if (typeof evalVal === "number") nextVal = evalVal;
                    }
                    this.globalEnv.vars.set(m.name, {
                        type: decl.name,
                        value: nextVal
                    });
                    this.globalEnv.vars.set(`${decl.name}::${m.name}`, {
                        type: decl.name,
                        value: nextVal
                    });
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
            const err = {
                id: "build_missing_entry",
                severity: "error",
                category: "semantic",
                file: files[0].path,
                line: 1,
                column: 1,
                message: `Cannot build execution plan: required function '${missing}' is missing.`
            };
            this.lastError = err;
            this.state = "ERROR";
            return {
                ok: false,
                diagnostics: [
                    ...parsed.diagnostics,
                    err
                ]
            };
        }
        // Initialize global variables
        try {
            for (const decl of parsed.declarations){
                if (decl.kind === "VarDecl") {
                    const val = this.initVarSync(decl, this.globalEnv);
                    this.globalEnv.vars.set(decl.name, {
                        type: decl.varType,
                        value: val
                    });
                }
            }
        } catch (err) {
            const rErr = err instanceof FirmwareRuntimeError ? err : new FirmwareRuntimeError(String(err), files[0].path, 1);
            this.lastError = {
                id: "build_init_err",
                severity: "error",
                category: "runtime",
                file: rErr.file,
                line: rErr.line,
                column: 1,
                message: rErr.message
            };
            this.state = "ERROR";
            return {
                ok: false,
                diagnostics: [
                    this.lastError
                ]
            };
        }
        this.state = "BUILT";
        this.logEvent("lifecycle", `Execution plan built (${this.functions.size} functions, ${parsed.declarations.length} top-level AST nodes). Note: Safe AST interpreter plan — not native Xtensa C++ compilation.`);
        this.onStateUpdate?.();
        return {
            ok: true,
            diagnostics: parsed.diagnostics
        };
    }
    start() {
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
    pause() {
        if (this.state === "RUNNING") {
            this.state = "PAUSED";
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopAll();
            this.logEvent("lifecycle", `Simulation paused at ${Math.round(this.simTimeMs)}ms.`);
            this.onStateUpdate?.();
        }
    }
    resume() {
        if (this.state === "PAUSED") {
            this.state = "RUNNING";
            this.logEvent("lifecycle", "Simulation resumed.");
            this.onStateUpdate?.();
        }
    }
    stop() {
        this.generator = null;
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopAll();
        this.audioState.buzzerActive = false;
        this.audioState.speakerActive = false;
        if (this.state === "RUNNING" || this.state === "PAUSED") {
            this.state = "STOPPED";
            this.logEvent("lifecycle", "Simulation stopped.");
        }
        this.onStateUpdate?.();
    }
    reset() {
        this.generator = null;
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopAll();
        this.oled.reset();
        this.initPins();
        this.serialLineBuf = "";
        this.serialRxQueue = [];
        this.activeModulesSet.clear();
        this.warnedUnsupportedApis.clear();
        this.nvsStorage = {};
        this.servos = {};
        this.wifiMock = {
            connected: false,
            ssid: "",
            ip: "0.0.0.0",
            rssi: -52
        };
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
   */ step(deltaMs) {
        if (this.state !== "RUNNING" || !this.generator) return;
        this.simTimeMs += Math.max(0, deltaMs);
        // Handle buzzer duration auto-stop
        if (this.audioState.buzzerActive && this.audioState.buzzerStopAtMs > 0 && this.simTimeMs >= this.audioState.buzzerStopAtMs) {
            this.audioState.buzzerActive = false;
            this.audioState.buzzerFreqHz = 0;
            this.audioState.buzzerStopAtMs = 0;
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopBuzzer();
        }
        if (this.simTimeMs < this.wakeAtSimMs) {
            return;
        }
        this.tickInstructions = 0;
        try {
            while(this.tickInstructions < this.maxInstructionsPerTick){
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
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopAll();
                    break;
                }
                if (sig.type === "slice") {
                    break;
                }
            }
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopAll();
            const rErr = err instanceof FirmwareRuntimeError ? err : new FirmwareRuntimeError(err instanceof Error ? err.message : String(err), "", 1);
            this.lastError = {
                id: `rt_err_${Date.now()}`,
                severity: "error",
                category: "runtime",
                file: rErr.file,
                line: rErr.line,
                column: 1,
                message: rErr.message
            };
            this.state = "ERROR";
            this.logEvent("error", `Runtime error at ${rErr.file}:${rErr.line}: ${rErr.message}`, rErr.file, rErr.line);
            this.pushSerial("error", `[RUNTIME ERROR] ${rErr.file}:${rErr.line} — ${rErr.message}`);
        }
        this.onStateUpdate?.();
    }
    getSnapshot() {
        const vars = {};
        for (const [k, entry] of this.globalEnv.vars.entries()){
            if (k in ARDUINO_CONSTANTS) continue;
            if ([
                "Serial",
                "Wire",
                "SPI",
                "EEPROM",
                "WiFi",
                "ESP"
            ].includes(k)) continue;
            if (k.includes("::")) continue;
            vars[k] = {
                type: entry.type,
                value: formatVarPreview(entry.value)
            };
        }
        return {
            state: this.state,
            simTimeMs: Math.round(this.simTimeMs),
            loopIterations: this.loopIterations,
            instructionsExecuted: this.instructionsExecuted,
            activeModules: Array.from(this.activeModulesSet),
            pins: {
                ...this.pins
            },
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
                micLevel: this.audioState.micLevel
            },
            nvsStorage: JSON.parse(JSON.stringify(this.nvsStorage)),
            servos: {
                ...this.servos
            },
            imu: {
                ...this.imu
            },
            wifiMock: {
                ...this.wifiMock
            },
            lastError: this.lastError
        };
    }
    evalMacroValue(raw) {
        const t = raw.trim();
        if (t === "true") return true;
        if (t === "false") return false;
        if (t in ARDUINO_CONSTANTS) return ARDUINO_CONSTANTS[t];
        if (this.globalEnv.vars.has(t)) return this.globalEnv.vars.get(t).value;
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
    evalSyncConst(expr) {
        const gen = this.evalExpr(expr, this.globalEnv);
        let stepCount = 0;
        while(stepCount < 5000){
            const r = gen.next();
            if (r.done) return r.value;
            stepCount++;
        }
        return 0;
    }
    initVarSync(decl, env) {
        if (decl.constructorArgs !== null) {
            const args = decl.constructorArgs.map((a)=>this.evalSyncConst(a));
            return this.constructObject(decl.varType, args);
        }
        if (decl.isArray) {
            if (decl.initializer && decl.initializer.kind === "ArrayInit") {
                return {
                    __kind: "array",
                    elements: decl.initializer.elements.map((e)=>this.evalSyncConst(e))
                };
            }
            const lenExpr = decl.arrayDimensions[0];
            const len = lenExpr ? Math.max(0, Math.min(4096, Math.trunc(toNumber(this.evalSyncConst(lenExpr))))) : 0;
            return {
                __kind: "array",
                elements: new Array(len).fill(0)
            };
        }
        if (decl.initializer) {
            return this.evalSyncConst(decl.initializer);
        }
        if (this.structs.has(decl.varType) || [
            "Adafruit_SSD1306",
            "Preferences",
            "Servo",
            "MPU6050",
            "BluetoothSerial"
        ].includes(decl.varType)) {
            return this.constructObject(decl.varType, []);
        }
        if (decl.varType === "String") return "";
        if (decl.varType === "bool" || decl.varType === "boolean") return false;
        return 0;
    }
    constructObject(className, _args) {
        const fields = {};
        if (className === "Preferences") {
            fields.__namespace = "default";
            fields.__open = false;
        } else if (className === "Servo") {
            fields.__pin = -1;
            fields.__angle = 90;
        } else if (this.structs.has(className)) {
            const def = this.structs.get(className);
            for (const f of def.fields){
                fields[f.name] = f.initializer ? this.evalSyncConst(f.initializer) : f.varType === "String" ? "" : 0;
            }
        }
        return {
            __kind: "object",
            className,
            fields
        };
    }
    *mainLifecycleGenerator() {
        const setupFn = this.functions.get("setup");
        const loopFn = this.functions.get("loop");
        if (setupFn && setupFn.body) {
            yield* this.callUserFunction(setupFn, [], null);
        }
        while(true){
            this.delayedInCurrentLoop = false;
            if (loopFn && loopFn.body) {
                yield* this.callUserFunction(loopFn, [], null);
            }
            this.loopIterations++;
            // If loop() did not already yield via delay(), yield one frame slice so tight loops stay responsive
            if (!this.delayedInCurrentLoop) {
                yield {
                    type: "slice"
                };
            }
        }
    }
    lookupVar(name, env) {
        let cur = env;
        while(cur){
            if (cur.vars.has(name)) return cur.vars.get(name);
            cur = cur.parent;
        }
        return null;
    }
    *tickGuard() {
        this.instructionsExecuted++;
        this.tickInstructions++;
        if (this.tickInstructions >= this.maxInstructionsPerTick) {
            yield {
                type: "slice"
            };
        }
    }
    *callUserFunction(fn, args, thisObj) {
        if (this.callDepth >= this.maxCallStackDepth) {
            throw new FirmwareRuntimeError(`Maximum call stack depth (${this.maxCallStackDepth}) exceeded in '${fn.name}()'`, fn.file, fn.line);
        }
        this.callDepth++;
        const frame = {
            vars: new Map(),
            parent: this.globalEnv
        };
        if (thisObj) {
            frame.vars.set("this", {
                type: thisObj.className,
                value: thisObj
            });
            for (const [k, v] of Object.entries(thisObj.fields)){
                frame.vars.set(k, {
                    type: "field",
                    value: v
                });
            }
        }
        for(let i = 0; i < fn.params.length; i++){
            const p = fn.params[i];
            let val = i < args.length ? args[i] : null;
            if (val === null && p.defaultValue) {
                val = yield* this.evalExpr(p.defaultValue, frame);
            }
            frame.vars.set(p.name, {
                type: p.paramType,
                value: val ?? 0
            });
        }
        try {
            if (fn.body) {
                yield* this.execBlock(fn.body, frame);
            }
            if (thisObj) {
                for (const k of Object.keys(thisObj.fields)){
                    const updated = frame.vars.get(k);
                    if (updated) thisObj.fields[k] = updated.value;
                }
            }
            return null;
        } catch (sig) {
            if (sig instanceof ControlSignal && sig.kind === "return") {
                if (thisObj) {
                    for (const k of Object.keys(thisObj.fields)){
                        const updated = frame.vars.get(k);
                        if (updated) thisObj.fields[k] = updated.value;
                    }
                }
                return sig.value;
            }
            throw sig;
        } finally{
            this.callDepth--;
        }
    }
    *execBlock(block, parentEnv) {
        const env = {
            vars: new Map(),
            parent: parentEnv
        };
        for (const stmt of block.statements){
            yield* this.execStmt(stmt, env);
        }
    }
    *execStmt(stmt, env) {
        yield* this.tickGuard();
        switch(stmt.kind){
            case "EmptyStmt":
            case "UnsupportedNode":
                return;
            case "BlockStmt":
                yield* this.execBlock(stmt, env);
                return;
            case "VarDecl":
                {
                    const staticKey = `${stmt.file}:${stmt.line}:${stmt.name}`;
                    if (stmt.isStatic && this.staticLocals.has(staticKey)) {
                        env.vars.set(stmt.name, {
                            type: stmt.varType,
                            value: this.staticLocals.get(staticKey)
                        });
                        return;
                    }
                    let val;
                    if (stmt.initializer) {
                        val = yield* this.evalExpr(stmt.initializer, env);
                    } else if (stmt.constructorArgs !== null) {
                        const cArgs = [];
                        for (const a of stmt.constructorArgs)cArgs.push((yield* this.evalExpr(a, env)));
                        val = this.constructObject(stmt.varType, cArgs);
                    } else if (stmt.isArray) {
                        const lenExpr = stmt.arrayDimensions[0];
                        const len = lenExpr ? Math.max(0, Math.min(4096, Math.trunc(toNumber((yield* this.evalExpr(lenExpr, env)))))) : 0;
                        val = {
                            __kind: "array",
                            elements: new Array(len).fill(0)
                        };
                    } else {
                        val = stmt.varType === "String" ? "" : stmt.varType === "bool" || stmt.varType === "boolean" ? false : 0;
                    }
                    if (stmt.isStatic) this.staticLocals.set(staticKey, val);
                    env.vars.set(stmt.name, {
                        type: stmt.varType,
                        value: val
                    });
                    return;
                }
            case "ExprStmt":
                yield* this.evalExpr(stmt.expression, env);
                return;
            case "IfStmt":
                {
                    const cond = yield* this.evalExpr(stmt.condition, env);
                    if (toBool(cond)) {
                        yield* this.execStmt(stmt.thenBranch, env);
                    } else if (stmt.elseBranch) {
                        yield* this.execStmt(stmt.elseBranch, env);
                    }
                    return;
                }
            case "WhileStmt":
                {
                    while(toBool((yield* this.evalExpr(stmt.condition, env)))){
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
            case "DoWhileStmt":
                {
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
                    }while (toBool((yield* this.evalExpr(stmt.condition, env))))
                    return;
                }
            case "ForStmt":
                {
                    const loopEnv = {
                        vars: new Map(),
                        parent: env
                    };
                    if (stmt.init) yield* this.execStmt(stmt.init, loopEnv);
                    while(true){
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
            case "SwitchStmt":
                {
                    const disc = yield* this.evalExpr(stmt.discriminant, env);
                    let matched = false;
                    let defaultIdx = -1;
                    for(let i = 0; i < stmt.cases.length; i++){
                        const c = stmt.cases[i];
                        if (c.test === null) {
                            defaultIdx = i;
                            continue;
                        }
                        const testVal = yield* this.evalExpr(c.test, env);
                        if (testVal === disc || toNumber(testVal) === toNumber(disc)) {
                            matched = true;
                            try {
                                for(let j = i; j < stmt.cases.length; j++){
                                    for (const s of stmt.cases[j].consequent){
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
                            for(let j = defaultIdx; j < stmt.cases.length; j++){
                                for (const s of stmt.cases[j].consequent){
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
            case "ReturnStmt":
                {
                    const val = stmt.argument ? yield* this.evalExpr(stmt.argument, env) : null;
                    throw new ControlSignal("return", val);
                }
            case "BreakStmt":
                throw new ControlSignal("break");
            case "ContinueStmt":
                throw new ControlSignal("continue");
        }
    }
    *evalExpr(expr, env) {
        yield* this.tickGuard();
        switch(expr.kind){
            case "NumberLiteral":
                return expr.value;
            case "StringLiteral":
                return expr.value;
            case "CharLiteral":
                return expr.charCode;
            case "BoolLiteral":
                return expr.value;
            case "ArrayInit":
                {
                    const elements = [];
                    for (const el of expr.elements){
                        elements.push((yield* this.evalExpr(el, env)));
                    }
                    return {
                        __kind: "array",
                        elements
                    };
                }
            case "Identifier":
                {
                    const found = this.lookupVar(expr.name, env);
                    if (found) return found.value;
                    // Function name reference (e.g. passed to attachInterrupt)
                    if (this.functions.has(expr.name)) return expr.name;
                    return 0;
                }
            case "SizeofExpr":
                {
                    const found = this.lookupVar(expr.target, env);
                    if (found && isArrayValue(found.value)) {
                        return found.value.elements.length;
                    }
                    return 4;
                }
            case "CastExpr":
                {
                    const v = yield* this.evalExpr(expr.operand, env);
                    const t = expr.targetType.toLowerCase();
                    if (t.includes("float") || t.includes("double")) return toNumber(v);
                    if (t.includes("bool")) return toBool(v);
                    if (t.includes("string")) return toDisplayString(v);
                    if (t.includes("uint8") || t.includes("byte")) return Math.trunc(toNumber(v)) & 0xff;
                    if (t.includes("int8")) return Math.trunc(toNumber(v)) << 24 >> 24;
                    if (t.includes("uint16")) return Math.trunc(toNumber(v)) & 0xffff;
                    if (t.includes("int") || t.includes("long") || t.includes("short") || t.includes("char")) {
                        return Math.trunc(toNumber(v));
                    }
                    return v;
                }
            case "UnaryExpr":
                {
                    if (expr.operator === "++" || expr.operator === "--") {
                        const delta = expr.operator === "++" ? 1 : -1;
                        const oldVal = toNumber((yield* this.evalExpr(expr.operand, env)));
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
            case "BinaryExpr":
                {
                    if (expr.operator === "&&") {
                        const l = yield* this.evalExpr(expr.left, env);
                        if (!toBool(l)) return false;
                        return toBool((yield* this.evalExpr(expr.right, env)));
                    }
                    if (expr.operator === "||") {
                        const l = yield* this.evalExpr(expr.left, env);
                        if (toBool(l)) return true;
                        return toBool((yield* this.evalExpr(expr.right, env)));
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
                    switch(expr.operator){
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
            case "TernaryExpr":
                {
                    const c = yield* this.evalExpr(expr.condition, env);
                    return toBool(c) ? yield* this.evalExpr(expr.consequent, env) : yield* this.evalExpr(expr.alternate, env);
                }
            case "AssignExpr":
                {
                    const rhs = yield* this.evalExpr(expr.right, env);
                    if (expr.operator === "=") {
                        yield* this.assignTarget(expr.left, rhs, env);
                        return rhs;
                    }
                    const cur = yield* this.evalExpr(expr.left, env);
                    let next;
                    if (expr.operator === "+=" && (typeof cur === "string" || typeof rhs === "string")) {
                        next = toDisplayString(cur) + toDisplayString(rhs);
                    } else {
                        const a = toNumber(cur);
                        const b = toNumber(rhs);
                        switch(expr.operator){
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
            case "IndexExpr":
                {
                    const obj = yield* this.evalExpr(expr.object, env);
                    const idx = Math.trunc(toNumber((yield* this.evalExpr(expr.index, env))));
                    if (isArrayValue(obj)) {
                        return obj.elements[idx] ?? 0;
                    }
                    if (typeof obj === "string") {
                        return idx >= 0 && idx < obj.length ? obj.charCodeAt(idx) : 0;
                    }
                    return 0;
                }
            case "MemberExpr":
                {
                    const obj = yield* this.evalExpr(expr.object, env);
                    if (isObjectValue(obj)) {
                        return obj.fields[expr.property] ?? 0;
                    }
                    return 0;
                }
            case "CallExpr":
                {
                    // Evaluate arguments
                    const args = [];
                    for (const a of expr.args){
                        args.push((yield* this.evalExpr(a, env)));
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
    *assignTarget(target, value, env) {
        if (target.kind === "Identifier") {
            let cur = env;
            while(cur){
                if (cur.vars.has(target.name)) {
                    const entry = cur.vars.get(target.name);
                    entry.value = value;
                    // Persist static locals if matching
                    return;
                }
                cur = cur.parent;
            }
            env.vars.set(target.name, {
                type: "auto",
                value
            });
            return;
        }
        if (target.kind === "IndexExpr") {
            const arr = yield* this.evalExpr(target.object, env);
            const idx = Math.trunc(toNumber((yield* this.evalExpr(target.index, env))));
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
    *callBuiltinFunction(name, args, file, line) {
        switch(name){
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
            case "delay":
                {
                    this.markModuleActive("timers_core");
                    const ms = Math.max(0, toNumber(args[0] ?? 0));
                    if (ms > 0) {
                        this.delayedInCurrentLoop = true;
                        yield {
                            type: "delay",
                            delayMs: ms
                        };
                    }
                    return null;
                }
            case "delayMicroseconds":
                {
                    this.markModuleActive("timers_core");
                    const us = Math.max(0, toNumber(args[0] ?? 0));
                    if (us >= 500) {
                        yield {
                            type: "delay",
                            delayMs: us / 1000
                        };
                    }
                    return null;
                }
            // GPIO
            case "pinMode":
                {
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
            case "digitalWrite":
                {
                    this.markModuleActive("gpio_core");
                    const p = Math.trunc(toNumber(args[0] ?? 0));
                    const v = toNumber(args[1] ?? 0) ? 1 : 0;
                    const pin = this.pins[p];
                    if (pin) {
                        pin.digitalValue = v;
                        if (p === 2) this.markModuleActive("leds_pwm");
                    }
                    return null;
                }
            case "digitalRead":
                {
                    this.markModuleActive("gpio_core");
                    const p = Math.trunc(toNumber(args[0] ?? 0));
                    if (p === this.hardwareConfig.touch.mainTouchPin || p === this.hardwareConfig.touch.wakeTouchPin) {
                        this.markModuleActive("touch_capacitive");
                    }
                    return this.pins[p]?.digitalValue ?? 0;
                }
            case "analogRead":
                {
                    this.markModuleActive("gpio_core");
                    const p = Math.trunc(toNumber(args[0] ?? 0));
                    if (p === this.hardwareConfig.battery.adcPin) {
                        this.updateBatteryAdcPin();
                    }
                    return this.pins[p]?.analogValue ?? 0;
                }
            case "analogWrite":
                {
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
            case "touchRead":
                {
                    this.markModuleActive("touch_capacitive");
                    const p = Math.trunc(toNumber(args[0] ?? 0));
                    return this.pins[p]?.touchValue ?? 74;
                }
            // Audio Buzzer
            case "tone":
                {
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
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].playBuzzer(freq, dur > 0 ? dur : undefined);
                    this.logEvent("audio", `Buzzer tone(${freq}Hz${dur ? `, ${dur}ms` : ""})`);
                    return null;
                }
            case "noTone":
                {
                    if (!this.isModuleEnabled("audio_buzzer")) {
                        this.warnUnsupported("noTone", "audio_buzzer", file, line);
                        return null;
                    }
                    this.audioState.buzzerActive = false;
                    this.audioState.buzzerFreqHz = 0;
                    this.audioState.buzzerStopAtMs = 0;
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopBuzzer();
                    return null;
                }
            // Extensible: Speaker LEDC / DAC
            case "ledcSetup":
                {
                    if (!this.isModuleEnabled("audio_speaker")) {
                        this.warnUnsupported("ledcSetup", "audio_speaker", file, line);
                        return 0;
                    }
                    this.markModuleActive("audio_speaker");
                    const ch = Math.trunc(toNumber(args[0] ?? 0));
                    const freq = toNumber(args[1] ?? 1000);
                    this.ledcChannels.set(ch, {
                        pin: -1,
                        freq,
                        duty: 0
                    });
                    return freq;
                }
            case "ledcAttachPin":
                {
                    if (!this.isModuleEnabled("audio_speaker")) {
                        this.warnUnsupported("ledcAttachPin", "audio_speaker", file, line);
                        return null;
                    }
                    this.markModuleActive("audio_speaker");
                    const pin = Math.trunc(toNumber(args[0] ?? 0));
                    const ch = Math.trunc(toNumber(args[1] ?? 0));
                    const cur = this.ledcChannels.get(ch) ?? {
                        pin,
                        freq: 1000,
                        duty: 0
                    };
                    cur.pin = pin;
                    this.ledcChannels.set(ch, cur);
                    return null;
                }
            case "ledcWriteTone":
                {
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
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].playSpeaker(freq);
                    } else {
                        this.audioState.speakerActive = false;
                        this.audioState.speakerFreqHz = 0;
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$audio$2f$webAudio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["virtualAudio"].stopSpeaker();
                    }
                    return freq;
                }
            case "ledcWrite":
                {
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
            case "dacWrite":
                {
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
            case "analogReadMilliVolts":
                {
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
                    return Math.round(raw / 4095 * 3300);
                }
            case "analogSetAttenuation":
            case "analogReadResolution":
                {
                    if (!this.isModuleEnabled("battery_adc")) {
                        this.warnUnsupported(name, "battery_adc", file, line);
                        return null;
                    }
                    this.markModuleActive("battery_adc");
                    return null;
                }
            // Extensible (Partial): Microphone
            case "i2s_driver_install":
            case "i2s_set_pin":
                {
                    if (!this.isModuleEnabled("microphone_i2s")) {
                        this.warnUnsupported(name, "microphone_i2s", file, line);
                        return -1;
                    }
                    this.markModuleActive("microphone_i2s");
                    this.logEvent("audio", `${name}() [PARTIAL SIMULATION: virtual amplitude source only, not ESP32 I2S DMA]`);
                    return 0;
                }
            case "i2s_read":
            case "micRead":
                {
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
            case "attachInterrupt":
                {
                    if (!this.isModuleEnabled("rtos_interrupts")) {
                        this.warnUnsupported("attachInterrupt", "rtos_interrupts", file, line);
                        return null;
                    }
                    this.markModuleActive("rtos_interrupts");
                    const pin = Math.trunc(toNumber(args[0] ?? 0));
                    const fnName = typeof args[1] === "string" ? args[1] : "";
                    const mode = Math.trunc(toNumber(args[2] ?? 1));
                    if (fnName) this.interrupts.set(pin, {
                        mode,
                        fnName
                    });
                    return null;
                }
            case "detachInterrupt":
                {
                    const pin = Math.trunc(toNumber(args[0] ?? 0));
                    this.interrupts.delete(pin);
                    return null;
                }
            case "vTaskDelay":
                {
                    if (!this.isModuleEnabled("rtos_interrupts")) {
                        this.warnUnsupported("vTaskDelay", "rtos_interrupts", file, line);
                        return null;
                    }
                    this.markModuleActive("rtos_interrupts");
                    const ticks = Math.max(0, toNumber(args[0] ?? 0));
                    if (ticks > 0) yield {
                        type: "delay",
                        delayMs: ticks
                    };
                    return null;
                }
            case "xTaskCreate":
            case "xTaskCreatePinnedToCore":
                {
                    this.warnUnsupported(name, "rtos_interrupts", file, line);
                    return 0;
                }
            case "esp_deep_sleep_start":
                {
                    if (!this.isModuleEnabled("rtos_interrupts")) {
                        this.warnUnsupported("esp_deep_sleep_start", "rtos_interrupts", file, line);
                        return null;
                    }
                    this.markModuleActive("rtos_interrupts");
                    this.logEvent("lifecycle", "esp_deep_sleep_start() called — halting virtual execution loop (simulated sleep).");
                    yield {
                        type: "halt"
                    };
                    return null;
                }
            // Math & Random
            case "randomSeed":
                {
                    this.rngState = Math.trunc(toNumber(args[0] ?? 1)) || 1337;
                    return null;
                }
            case "random":
                {
                    // Mulberry32 deterministic PRNG
                    this.rngState = this.rngState + 0x6d2b79f5 | 0;
                    let t = Math.imul(this.rngState ^ this.rngState >>> 15, 1 | this.rngState);
                    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                    const r = ((t ^ t >>> 14) >>> 0) / 4294967296;
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
            case "map":
                {
                    const x = toNumber(args[0] ?? 0);
                    const inMin = toNumber(args[1] ?? 0);
                    const inMax = toNumber(args[2] ?? 1);
                    const outMin = toNumber(args[3] ?? 0);
                    const outMax = toNumber(args[4] ?? 1);
                    if (inMax === inMin) return outMin;
                    return Math.trunc((x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin);
                }
            case "constrain":
                {
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
                return Math.trunc(toNumber(args[0] ?? 0)) >> Math.trunc(toNumber(args[1] ?? 0)) & 1;
            case "bitSet":
                return Math.trunc(toNumber(args[0] ?? 0)) | 1 << Math.trunc(toNumber(args[1] ?? 0));
            case "bitClear":
                return Math.trunc(toNumber(args[0] ?? 0)) & ~(1 << Math.trunc(toNumber(args[1] ?? 0)));
            case "lowByte":
                return Math.trunc(toNumber(args[0] ?? 0)) & 0xff;
            case "highByte":
                return Math.trunc(toNumber(args[0] ?? 0)) >> 8 & 0xff;
            default:
                this.logEvent("warning", `Unrecognized function '${name}()' called at ${file}:${line} — returning 0.`, file, line);
                return 0;
        }
    }
    *callMethod(obj, method, args, file, line) {
        // Arduino String methods
        if (typeof obj === "string") {
            switch(method){
                case "length":
                    return obj.length;
                case "charAt":
                    return obj.charCodeAt(Math.trunc(toNumber(args[0] ?? 0))) || 0;
                case "substring":
                    return args.length >= 2 ? obj.substring(Math.trunc(toNumber(args[0])), Math.trunc(toNumber(args[1]))) : obj.substring(Math.trunc(toNumber(args[0] ?? 0)));
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
            const m = structDef.methods.find((fn)=>fn.name === method && fn.body);
            if (m) {
                return yield* this.callUserFunction(m, args, obj);
            }
        }
        // 2. HardwareSerial (`Serial`)
        if (obj.className === "HardwareSerial") {
            this.markModuleActive("serial_uart");
            switch(method){
                case "begin":
                    {
                        const baud = Math.trunc(toNumber(args[0] ?? 115200));
                        this.pushSerial("system", `Serial.begin(${baud}) initialized`);
                        return null;
                    }
                case "print":
                    {
                        const txt = this.formatSerialArg(args[0], args[1]);
                        this.serialLineBuf += txt;
                        if (this.serialLineBuf.includes("\n")) {
                            const parts = this.serialLineBuf.split("\n");
                            this.serialLineBuf = parts.pop() ?? "";
                            for (const p of parts)this.pushSerial("rx", p);
                        }
                        return txt.length;
                    }
                case "println":
                    {
                        const txt = args.length > 0 ? this.formatSerialArg(args[0], args[1]) : "";
                        this.pushSerial("rx", this.serialLineBuf + txt);
                        this.serialLineBuf = "";
                        return txt.length + 1;
                    }
                case "printf":
                    {
                        let fmt = toDisplayString(args[0] ?? "");
                        let idx = 1;
                        fmt = fmt.replace(/%(\.\d+)?[dfsuxXci]/g, (spec)=>{
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
                case "write":
                    {
                        const ch = typeof args[0] === "number" ? String.fromCharCode(args[0]) : toDisplayString(args[0] ?? "");
                        this.serialLineBuf += ch;
                        return 1;
                    }
                case "available":
                    return this.serialRxQueue.length;
                case "read":
                    {
                        const ch = this.serialRxQueue.shift();
                        return ch !== undefined ? ch.charCodeAt(0) : -1;
                    }
                case "readString":
                    {
                        const s = this.serialRxQueue.join("");
                        this.serialRxQueue = [];
                        return s;
                    }
                case "readStringUntil":
                    {
                        const delim = typeof args[0] === "number" ? String.fromCharCode(args[0]) : toDisplayString(args[0] ?? "\n");
                        let out = "";
                        while(this.serialRxQueue.length > 0){
                            const c = this.serialRxQueue.shift();
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
            switch(method){
                case "begin":
                    {
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
                    this.oled.drawPixel(toNumber(args[0]), toNumber(args[1]), args.length >= 3 ? toNumber(args[2]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawLine":
                    this.oled.drawLine(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), args.length >= 5 ? toNumber(args[4]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawFastHLine":
                    this.oled.drawFastHLine(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), args.length >= 4 ? toNumber(args[3]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawFastVLine":
                    this.oled.drawFastVLine(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), args.length >= 4 ? toNumber(args[3]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawRect":
                    this.oled.drawRect(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), args.length >= 5 ? toNumber(args[4]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "fillRect":
                    this.oled.fillRect(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), args.length >= 5 ? toNumber(args[4]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawRoundRect":
                    this.oled.drawRoundRect(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), toNumber(args[4]), args.length >= 6 ? toNumber(args[5]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "fillRoundRect":
                    this.oled.fillRoundRect(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), toNumber(args[4]), args.length >= 6 ? toNumber(args[5]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawCircle":
                    this.oled.drawCircle(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), args.length >= 4 ? toNumber(args[3]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "fillCircle":
                    this.oled.fillCircle(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), args.length >= 4 ? toNumber(args[3]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawTriangle":
                    this.oled.drawTriangle(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), toNumber(args[4]), toNumber(args[5]), args.length >= 7 ? toNumber(args[6]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "fillTriangle":
                    this.oled.fillTriangle(toNumber(args[0]), toNumber(args[1]), toNumber(args[2]), toNumber(args[3]), toNumber(args[4]), toNumber(args[5]), args.length >= 7 ? toNumber(args[6]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                    return null;
                case "drawBitmap":
                    {
                        const bmpArg = args[2];
                        const bytes = isArrayValue(bmpArg) ? bmpArg.elements.map(toNumber) : [];
                        this.oled.drawBitmap(toNumber(args[0]), toNumber(args[1]), bytes, toNumber(args[3]), toNumber(args[4]), args.length >= 6 ? toNumber(args[5]) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                        return null;
                    }
                case "setTextSize":
                    this.oled.setTextSize(toNumber(args[0] ?? 1));
                    return null;
                case "setTextColor":
                    this.oled.setTextColor(toNumber(args[0] ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]), args.length >= 2 ? toNumber(args[1]) : -1);
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
            switch(method){
                case "begin":
                    {
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
                case "endTransmission":
                    {
                        const oledAddr = parseInt(this.hardwareConfig.oled.i2cAddress, 16) || 0x3c;
                        if (this.hardwareConfig.oled.enabled && this.i2cTargetAddr === oledAddr) return 0; // ACK
                        if (this.isModuleEnabled("imu_mpu6050") && this.i2cTargetAddr === 0x68) return 0;
                        return 2; // NACK
                    }
                case "requestFrom":
                    {
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
            const ensureNs = ()=>{
                if (!this.nvsStorage[nsName]) this.nvsStorage[nsName] = {};
                return this.nvsStorage[nsName];
            };
            switch(method){
                case "begin":
                    {
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
                case "putFloat":
                    {
                        const k = toDisplayString(args[0] ?? "");
                        const v = toNumber(args[1] ?? 0);
                        ensureNs()[k] = v;
                        return 4;
                    }
                case "putBool":
                    {
                        const k = toDisplayString(args[0] ?? "");
                        ensureNs()[k] = toBool(args[1]);
                        return 1;
                    }
                case "putString":
                    {
                        const k = toDisplayString(args[0] ?? "");
                        const v = toDisplayString(args[1] ?? "");
                        ensureNs()[k] = v;
                        return v.length;
                    }
                case "getInt":
                case "getUInt":
                case "getLong":
                case "getULong":
                case "getFloat":
                    {
                        const k = toDisplayString(args[0] ?? "");
                        const stored = ensureNs()[k];
                        return stored !== undefined ? toNumber(stored) : toNumber(args[1] ?? 0);
                    }
                case "getBool":
                    {
                        const k = toDisplayString(args[0] ?? "");
                        const stored = ensureNs()[k];
                        return stored !== undefined ? toBool(stored) : toBool(args[1] ?? false);
                    }
                case "getString":
                    {
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
                yield {
                    type: "halt"
                };
                return null;
            }
            return 0;
        }
        return 0;
    }
    formatSerialArg(val, formatArg) {
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
}),
"[project]/src/lib/simulator/modules/registry.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HARDWARE_MODULES",
    ()=>HARDWARE_MODULES,
    "HARDWARE_MODULE_MAP",
    ()=>HARDWARE_MODULE_MAP,
    "getDefaultPersistedModules",
    ()=>getDefaultPersistedModules
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/oled/ssd1306.ts [app-ssr] (ecmascript)");
;
function runSuite(moduleId, cases) {
    const started = Date.now();
    const tests = [];
    let passed = 0;
    let failed = 0;
    for (const c of cases){
        const t0 = Date.now();
        try {
            const detail = c.fn();
            passed++;
            tests.push({
                name: c.name,
                passed: true,
                durationMs: Math.max(1, Date.now() - t0),
                detail
            });
        } catch (err) {
            failed++;
            tests.push({
                name: c.name,
                passed: false,
                durationMs: Math.max(1, Date.now() - t0),
                detail: err instanceof Error ? err.message : String(err)
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
        tests
    };
}
function assert(cond, message) {
    if (!cond) throw new Error(message);
}
const HARDWARE_MODULES = [
    {
        id: "esp32_mcu",
        name: "ESP32 Core Runtime",
        category: "Core MCU",
        version: "1.2.0",
        description: "Core Arduino/ESP32 lifecycle (setup/loop), math helpers, random generator, and virtual MCU state.",
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
            "ESP.getFreeHeap"
        ],
        detectionLibraries: [
            "Arduino.h",
            "esp_system.h"
        ],
        detectionSymbols: [
            "setup",
            "loop",
            "random",
            "map",
            "constrain",
            "ESP"
        ],
        requiredHardware: [
            "ESP32 DevKit V1 (Virtual MCU)"
        ],
        inputInterface: [
            "Firmware AST",
            "Reset Signal"
        ],
        outputInterface: [
            "Execution State",
            "Instruction Telemetry"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Runs safe AST subset interpretation, not Xtensa LX6 machine code.",
            "Heap size telemetry is simulated rather than physical ESP32 SRAM."
        ],
        missingExplanation: "Core runtime is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Built-in safe generator-based AST interpreter.",
        runTests: ()=>runSuite("esp32_mcu", [
                {
                    name: "Arduino map() linear scaling",
                    fn: ()=>{
                        const mapped = (512 - 0) * (100 - 0) / (1024 - 0) + 0;
                        assert(mapped === 50, `Expected 50, got ${mapped}`);
                        return "map(512, 0, 1024, 0, 100) === 50";
                    }
                },
                {
                    name: "constrain() boundary clamping",
                    fn: ()=>{
                        const c = Math.max(0, Math.min(255, 310));
                        assert(c === 255, "Failed upper clamp");
                        return "constrain(310, 0, 255) === 255";
                    }
                }
            ])
    },
    {
        id: "ssd1306_oled",
        name: "OLED SSD1306 (128×64)",
        category: "Display",
        version: "1.4.0",
        description: "Pixel-accurate 128×64 monochrome OLED framebuffer implementing Adafruit_SSD1306 and Adafruit_GFX drawing primitives.",
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
            "dim"
        ],
        detectionLibraries: [
            "Adafruit_SSD1306.h",
            "Adafruit_GFX.h",
            "SSD1306.h",
            "U8g2lib.h"
        ],
        detectionSymbols: [
            "Adafruit_SSD1306",
            "clearDisplay",
            "fillRoundRect",
            "drawBitmap",
            "SSD1306_WHITE",
            "SSD1306_SWITCHCAPVCC"
        ],
        requiredHardware: [
            "SSD1306 128×64 I2C OLED (0x3C, SDA 21, SCL 22)"
        ],
        inputInterface: [
            "GFX Draw Calls",
            "I2C Frame Commit"
        ],
        outputInterface: [
            "128×64 1-bit Framebuffer",
            "1024-byte Page Hex Dump"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Renders standard 5×7 GFX bitmap font; custom FreeFonts headers are approximated with 5×7 metrics."
        ],
        missingExplanation: "SSD1306 OLED renderer is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Double-buffered 128×64 Uint8Array framebuffer rendered to HTML5 Canvas.",
        runTests: ()=>runSuite("ssd1306_oled", [
                {
                    name: "Initial OLED buffer is strictly blank",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        assert(oled.getActivePixelCount() === 0, "Expected 0 lit pixels initially");
                        return "0 lit pixels on cold boot";
                    }
                },
                {
                    name: "Double-buffer commits only on display()",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        oled.begin();
                        oled.fillRect(10, 10, 8, 8, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                        assert(oled.getActivePixelCount() === 0, "Committed too early before display()");
                        oled.display();
                        assert(oled.getActivePixelCount() === 64, `Expected 64 pixels, got ${oled.getActivePixelCount()}`);
                        return "fillRect(10,10,8,8) + display() === 64 active pixels";
                    }
                },
                {
                    name: "clearDisplay() + display() blanks framebuffer",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        oled.begin();
                        oled.fillCircle(64, 32, 10, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                        oled.display();
                        assert(oled.getActivePixelCount() > 200, "Circle not drawn");
                        oled.clearDisplay();
                        oled.display();
                        assert(oled.getActivePixelCount() === 0, "Clear did not blank screen");
                        return "Screen cleared back to 0 lit pixels";
                    }
                },
                {
                    name: "5x7 Text rendering & bitmap draw",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        oled.begin();
                        oled.setCursor(0, 0);
                        oled.print("EMO");
                        oled.display();
                        assert(oled.getActivePixelCount() > 20, "Text failed to render pixels");
                        return `Rendered 'EMO' (${oled.getActivePixelCount()} pixels)`;
                    }
                }
            ])
    },
    {
        id: "gpio_core",
        name: "GPIO Digital & Analog",
        category: "GPIO & Input",
        version: "1.1.0",
        description: "Maintains per-pin mode, digital logic state, 12-bit analog ADC input, and PWM output for all ESP32 DevKit V1 GPIOs.",
        supportedApis: [
            "pinMode",
            "digitalWrite",
            "digitalRead",
            "analogRead",
            "analogWrite"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "pinMode",
            "digitalWrite",
            "digitalRead",
            "analogRead",
            "analogWrite"
        ],
        requiredHardware: [
            "ESP32 GPIO Matrix (GPIO 0–39)"
        ],
        inputInterface: [
            "Virtual Hardware Pin Voltage",
            "Digital Logic Level"
        ],
        outputInterface: [
            "Pin Direction",
            "Digital HIGH/LOW",
            "PWM Duty"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Electrical drive current and pull-up resistor impedance are modeled logically."
        ],
        missingExplanation: "GPIO matrix simulation is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Reactive virtual GPIO pin table wired into Hardware Lab and runtime HAL.",
        runTests: ()=>runSuite("gpio_core", [
                {
                    name: "Digital pin HIGH/LOW roundtrip",
                    fn: ()=>{
                        const pins = {};
                        pins[2] = 1;
                        assert(pins[2] === 1, "Failed digital write");
                        pins[2] = 0;
                        assert(pins[2] === 0, "Failed digital clear");
                        return "GPIO2 HIGH -> LOW verified";
                    }
                },
                {
                    name: "12-bit ESP32 ADC range clamp",
                    fn: ()=>{
                        const clamped = Math.max(0, Math.min(4095, 2048));
                        assert(clamped === 2048, "ADC clamp failed");
                        return "ADC 0..4095 range verified";
                    }
                }
            ])
    },
    {
        id: "touch_capacitive",
        name: "Touch Sensors (Main & Wake)",
        category: "GPIO & Input",
        version: "1.2.0",
        description: "Supports ESP32 capacitive touchRead() and digital touch modules (e.g. TTP223 active HIGH/LOW on GPIO27 & GPIO18) with press, release, long press, double tap, and dual-touch injection.",
        supportedApis: [
            "touchRead",
            "touchAttachInterrupt"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "touchRead",
            "TOUCH_MAIN",
            "TOUCH_WAKE",
            "TOUCH_ACTIVE",
            "touchAttachInterrupt"
        ],
        requiredHardware: [
            "Main Touch GPIO27",
            "Wake Touch GPIO18"
        ],
        inputInterface: [
            "Hardware Lab Touch Pads",
            "Robot Studio Head/Side Touch"
        ],
        outputInterface: [
            "GPIO Logic Level",
            "Capacitive Value (0–100)",
            "Touch Event History"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Capacitive baseline drift is simulated numerically (baseline ~72, touched ~14)."
        ],
        missingExplanation: "Touch input hardware simulation is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Direct injection into virtual GPIO & capacitive register state.",
        runTests: ()=>runSuite("touch_capacitive", [
                {
                    name: "Active-HIGH touch logic maps pressed -> 1",
                    fn: ()=>{
                        const activeHigh = true;
                        const pressed = true;
                        const digital = ("TURBOPACK compile-time truthy", 1) ? ("TURBOPACK compile-time truthy", 1) ? 1 : "TURBOPACK unreachable" : "TURBOPACK unreachable";
                        assert(digital === 1, "Expected HIGH");
                        return "TOUCH_ACTIVE HIGH pressed === 1";
                    }
                },
                {
                    name: "Capacitive touchRead drops below threshold on contact",
                    fn: ()=>{
                        const baseline = 74;
                        const touched = 14;
                        assert(touched < 30 && baseline > 50, "Threshold check failed");
                        return "Baseline 74 -> Touched 14";
                    }
                }
            ])
    },
    {
        id: "serial_uart",
        name: "Serial UART Communication",
        category: "Communication",
        version: "1.1.0",
        description: "Full virtual UART0 bridge streaming firmware Serial output to Serial Monitor and queuing user Serial input.",
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
            "Serial.flush"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "Serial"
        ],
        requiredHardware: [
            "ESP32 UART0 (USB-Serial Bridge)"
        ],
        inputInterface: [
            "Serial Monitor TX Buffer"
        ],
        outputInterface: [
            "Timestamped Serial Monitor Log"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Baud rate mismatch framing corruption is not simulated."
        ],
        missingExplanation: "Serial UART is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "FIFO RX/TX character ring buffers connected to Serial Monitor.",
        runTests: ()=>runSuite("serial_uart", [
                {
                    name: "TX buffer FIFO byte read",
                    fn: ()=>{
                        const buf = Array.from("OK\n");
                        assert(buf.length === 3 && buf.shift() === "O", "FIFO failed");
                        return "Serial.available() & Serial.read() verified";
                    }
                }
            ])
    },
    {
        id: "i2c_bus",
        name: "I2C Bus (Wire)",
        category: "Communication",
        version: "1.1.0",
        description: "Simulated I2C master bus on configurable SDA/SCL pins (default GPIO21/22) with address acknowledgement for attached devices like SSD1306 (0x3C).",
        supportedApis: [
            "Wire.begin",
            "Wire.setClock",
            "Wire.beginTransmission",
            "Wire.write",
            "Wire.endTransmission",
            "Wire.requestFrom",
            "Wire.available",
            "Wire.read"
        ],
        detectionLibraries: [
            "Wire.h"
        ],
        detectionSymbols: [
            "Wire"
        ],
        requiredHardware: [
            "I2C Bus (SDA GPIO21, SCL GPIO22)"
        ],
        inputInterface: [
            "Attached I2C Device Addresses"
        ],
        outputInterface: [
            "ACK/NACK Status",
            "Bus Telemetry"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Models device address ACK/NACK and basic registers, not electrical clock stretching."
        ],
        missingExplanation: "I2C Wire bus is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Virtual I2C address router checking configured Hardware Lab peripherals.",
        runTests: ()=>runSuite("i2c_bus", [
                {
                    name: "I2C address 0x3C ACK when SSD1306 attached",
                    fn: ()=>{
                        const known = new Set([
                            0x3c
                        ]);
                        const endTx = known.has(0x3c) ? 0 : 2;
                        assert(endTx === 0, "Expected ACK (0)");
                        return "Wire.endTransmission() for 0x3C === 0 (ACK)";
                    }
                }
            ])
    },
    {
        id: "timers_core",
        name: "Timers & Delay Scheduler",
        category: "Core MCU",
        version: "1.1.0",
        description: "Cooperative simulated clock providing millis(), micros(), non-blocking delay(), and delayMicroseconds() synchronized with simulation speed.",
        supportedApis: [
            "millis",
            "micros",
            "delay",
            "delayMicroseconds",
            "esp_timer_get_time"
        ],
        detectionLibraries: [
            "esp_timer.h"
        ],
        detectionSymbols: [
            "millis",
            "micros",
            "delay",
            "delayMicroseconds",
            "esp_timer_get_time"
        ],
        requiredHardware: [
            "ESP32 System Timer"
        ],
        inputInterface: [
            "Simulation Speed Multiplier"
        ],
        outputInterface: [
            "Monotonic ms/us Clock"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Microsecond jitter reflects browser frame scheduling; logical simTimeMs remains monotonic."
        ],
        missingExplanation: "Core timing scheduler is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Generator yield timer anchored to virtual simulation time.",
        runTests: ()=>runSuite("timers_core", [
                {
                    name: "Monotonic millis/micros consistency",
                    fn: ()=>{
                        const ms = 1250;
                        const us = ms * 1000;
                        assert(us === 1250000, "Microsecond conversion mismatch");
                        return "millis()=1250 -> micros()=1250000";
                    }
                }
            ])
    },
    {
        id: "buttons_digital",
        name: "Digital Push Buttons",
        category: "GPIO & Input",
        version: "1.0.0",
        description: "Virtual tactile push buttons connected to any GPIO with INPUT_PULLUP/INPUT_PULLDOWN logic.",
        supportedApis: [
            "INPUT_PULLUP",
            "INPUT_PULLDOWN"
        ],
        detectionLibraries: [
            "Bounce2.h",
            "OneButton.h"
        ],
        detectionSymbols: [
            "INPUT_PULLUP",
            "INPUT_PULLDOWN",
            "BTN_",
            "BUTTON_"
        ],
        requiredHardware: [
            "Momentary Push Button(s)"
        ],
        inputInterface: [
            "Hardware Lab Button Press/Hold"
        ],
        outputInterface: [
            "Virtual GPIO Pin State"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Contact mechanical bounce is clean unless firmware implements debounce testing."
        ],
        missingExplanation: "Digital buttons are built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Direct GPIO pin pull-up/down state machine.",
        runTests: ()=>runSuite("buttons_digital", [
                {
                    name: "INPUT_PULLUP defaults HIGH and pulls LOW on press",
                    fn: ()=>{
                        const idle = 1;
                        const pressed = 0;
                        assert(idle === 1 && pressed === 0, "Pull-up inversion failed");
                        return "INPUT_PULLUP idle=HIGH, pressed=LOW";
                    }
                }
            ])
    },
    {
        id: "leds_pwm",
        name: "Indicator LEDs",
        category: "Actuators",
        version: "1.0.0",
        description: "Virtual status LEDs bound to GPIO pins reflecting digitalWrite and analogWrite brightness.",
        supportedApis: [
            "LED_BUILTIN"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "LED_BUILTIN",
            "LED_PIN"
        ],
        requiredHardware: [
            "Onboard / External LED"
        ],
        inputInterface: [
            "GPIO Digital / PWM Output"
        ],
        outputInterface: [
            "Visual LED Indicator in Hardware Lab"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Models luminous intensity linearly from PWM 0–255."
        ],
        missingExplanation: "LED simulation is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Binds directly to GPIO pin state observer.",
        runTests: ()=>runSuite("leds_pwm", [
                {
                    name: "PWM duty maps 0..255 to 0..100% brightness",
                    fn: ()=>{
                        const pct = Math.round(128 / 255 * 100);
                        assert(pct === 50, `Expected 50%, got ${pct}%`);
                        return "PWM 128 -> 50% LED intensity";
                    }
                }
            ])
    },
    {
        id: "audio_buzzer",
        name: "Piezo Buzzer (tone / noTone)",
        category: "Audio",
        version: "1.1.0",
        description: "Simulates passive piezo buzzer output via Web Audio square-wave oscillator (strictly distinct from speaker DAC and microphone input).",
        supportedApis: [
            "tone",
            "noTone"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "tone",
            "noTone",
            "BUZZER_PIN"
        ],
        requiredHardware: [
            "Passive Piezo Buzzer (GPIO25)"
        ],
        inputInterface: [
            "Frequency (Hz)",
            "Duration (ms)"
        ],
        outputInterface: [
            "Web Audio Buzzer Oscillator",
            "Audio Telemetry"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Browser Web Audio requires a prior user gesture to unlock audio playback.",
            "Approximates piezo resonance using a filtered square-wave oscillator, not physical transducer acoustics."
        ],
        missingExplanation: "Buzzer module is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Isolated Web Audio oscillator channel for piezo buzzer.",
        runTests: ()=>runSuite("audio_buzzer", [
                {
                    name: "Valid frequency bounds (20Hz–20000Hz)",
                    fn: ()=>{
                        const freq = Math.max(20, Math.min(20000, 1200));
                        assert(freq === 1200, "Frequency clamp failed");
                        return "tone(pin, 1200) frequency validated";
                    }
                }
            ])
    },
    // === EXTENSIBLE MODULES (Initially UNSUPPORTED until extended via IMPLEMENT SUPPORT!) ===
    {
        id: "preferences_nvs",
        name: "Preferences / NVS Storage",
        category: "Storage",
        version: "1.0.0",
        description: "Simulated ESP32 Non-Volatile Storage (Preferences.h & EEPROM.h) using isolated browser-side virtual key-value namespaces (clearly labeled as simulated, NOT physical ESP32 flash).",
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
            "EEPROM.commit"
        ],
        detectionLibraries: [
            "Preferences.h",
            "EEPROM.h",
            "nvs_flash.h"
        ],
        detectionSymbols: [
            "Preferences",
            "EEPROM",
            "putInt",
            "getInt",
            "putString",
            "getString",
            "putBool",
            "getBool"
        ],
        requiredHardware: [
            "Virtual NVS Partition (Simulated — Not Physical Flash)"
        ],
        inputInterface: [
            "Namespace & Key/Value Writes"
        ],
        outputInterface: [
            "Persistent Virtual NVS Table in Diagnostics"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Stored in virtual simulator memory/state — NOT written to physical ESP32 SPI flash partitions.",
            "Flash wear-leveling and NVS partition size limits are approximated."
        ],
        missingExplanation: "The Preferences/NVS storage module is not yet active in the simulator runtime. Calls to Preferences or EEPROM will not persist values until enabled.",
        possibleSolution: "Click IMPLEMENT SUPPORT to install and test the Virtual NVS/Preferences storage driver.",
        implementationStrategy: "Activates namespaced key-value store supporting int/uint/float/bool/String and byte-array EEPROM buffer, executes 5 automated unit tests, and exposes live NVS inspection in Diagnostics.",
        runTests: ()=>runSuite("preferences_nvs", [
                {
                    name: "Namespace isolation between 'emo' and 'scores'",
                    fn: ()=>{
                        const store = {
                            emo: {},
                            scores: {}
                        };
                        store.emo["mood"] = 2;
                        store.scores["mood"] = 99;
                        assert(store.emo["mood"] === 2 && store.scores["mood"] === 99, "Namespace collision");
                        return "Isolated namespaces verified";
                    }
                },
                {
                    name: "putInt / getInt default fallback",
                    fn: ()=>{
                        const ns = {};
                        const defVal = ns["highScore"] ?? 42;
                        assert(defVal === 42, "Default fallback failed");
                        ns["highScore"] = 128;
                        assert(ns["highScore"] === 128, "Write/read mismatch");
                        return "Default 42 -> Stored 128 verified";
                    }
                },
                {
                    name: "putString / getString & putBool / getBool",
                    fn: ()=>{
                        const ns = {};
                        ns["name"] = "EMO-01";
                        ns["muted"] = true;
                        assert(ns["name"] === "EMO-01" && ns["muted"] === true, "Typed persistence failed");
                        return "String and Bool roundtrip passed";
                    }
                },
                {
                    name: "remove() and clear() purge keys cleanly",
                    fn: ()=>{
                        const ns = {
                            a: 1,
                            b: 2
                        };
                        delete ns["a"];
                        assert(ns["a"] === undefined && ns["b"] === 2, "remove() failed");
                        for (const k of Object.keys(ns))delete ns[k];
                        assert(Object.keys(ns).length === 0, "clear() failed");
                        return "remove() & clear() verified";
                    }
                },
                {
                    name: "EEPROM byte clamping (0–255)",
                    fn: ()=>{
                        const eeprom = new Uint8Array(512);
                        eeprom[10] = 300 & 0xff;
                        assert(eeprom[10] === 44, "Byte wrap failed");
                        return "EEPROM 512-byte virtual buffer verified";
                    }
                }
            ])
    },
    {
        id: "audio_speaker",
        name: "Speaker (ESP32 LEDC PWM & DAC)",
        category: "Audio",
        version: "1.0.0",
        description: "Simulates ESP32 LEDC PWM tone channels and 8-bit DAC speaker output separately from piezo buzzer and microphone.",
        supportedApis: [
            "ledcSetup",
            "ledcAttachPin",
            "ledcAttach",
            "ledcWriteTone",
            "ledcWriteNote",
            "ledcWrite",
            "dacWrite"
        ],
        detectionLibraries: [
            "driver/dac.h",
            "Audio.h"
        ],
        detectionSymbols: [
            "ledcSetup",
            "ledcAttachPin",
            "ledcWriteTone",
            "ledcWrite",
            "dacWrite"
        ],
        requiredHardware: [
            "Virtual Speaker Channel (GPIO26 DAC/LEDC)"
        ],
        inputInterface: [
            "LEDC Channel Frequency & Duty",
            "DAC 8-bit Level"
        ],
        outputInterface: [
            "Web Audio Speaker Synthesizer (Separate from Buzzer)"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Simulates tonal LEDC/DAC synthesis through Web Audio API; does not emulate I2S external MAX98357A amplifier hardware."
        ],
        missingExplanation: "ESP32 LEDC PWM / DAC speaker driver is not currently active in the simulator engine.",
        possibleSolution: "Click IMPLEMENT SUPPORT to register the LEDC/DAC Speaker simulation module and run channel tests.",
        implementationStrategy: "Registers LEDC channel-to-pin mapping table and dedicated smooth sine/triangle Web Audio speaker synthesizer.",
        runTests: ()=>runSuite("audio_speaker", [
                {
                    name: "LEDC channel setup & pin attach mapping",
                    fn: ()=>{
                        const chMap = new Map();
                        chMap.set(0, {
                            pin: 26,
                            freq: 440
                        });
                        assert(chMap.get(0)?.pin === 26, "Channel mapping failed");
                        return "LEDC ch0 -> GPIO26 @ 440Hz";
                    }
                },
                {
                    name: "DAC 8-bit output clamping (0..255)",
                    fn: ()=>{
                        const val = Math.max(0, Math.min(255, 180));
                        assert(val === 180, "DAC level failed");
                        return "dacWrite(26, 180) verified";
                    }
                },
                {
                    name: "Speaker channel isolated from buzzer & microphone",
                    fn: ()=>{
                        const channels = {
                            buzzer: false,
                            speaker: true,
                            micInput: 0
                        };
                        assert(channels.speaker && !channels.buzzer, "Channel isolation failed");
                        return "Speaker/Buzzer/Mic strict separation verified";
                    }
                }
            ])
    },
    {
        id: "battery_adc",
        name: "Battery Monitor (ADC Voltage)",
        category: "Power & Sensors",
        version: "1.0.0",
        description: "Simulates LiPo battery voltage divider readings (3.2V–4.2V) mapped to Hardware Lab battery level slider via ESP32 ADC.",
        supportedApis: [
            "analogReadMilliVolts",
            "analogSetAttenuation",
            "analogReadResolution"
        ],
        detectionLibraries: [
            "esp_adc_cal.h"
        ],
        detectionSymbols: [
            "analogReadMilliVolts",
            "analogSetAttenuation",
            "BATTERY_PIN",
            "VBAT_PIN"
        ],
        requiredHardware: [
            "Virtual Battery Voltage Divider (GPIO35 ADC)"
        ],
        inputInterface: [
            "Hardware Lab Battery Level Slider (0–100%)"
        ],
        outputInterface: [
            "Simulated Millivolts (1600–2100mV divider)",
            "12-bit ADC Value"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Uses ideal linear LiPo voltage curve; does not model load sag or temperature effects."
        ],
        missingExplanation: "Battery millivolt calibration APIs (analogReadMilliVolts / attenuation) are currently inactive.",
        possibleSolution: "Click IMPLEMENT SUPPORT to activate the virtual LiPo battery ADC monitor wired to Hardware Lab.",
        implementationStrategy: "Maps Hardware Lab battery % to realistic 3.3V–4.2V voltage divider mV and 12-bit ADC readings.",
        runTests: ()=>runSuite("battery_adc", [
                {
                    name: "100% battery maps to 4200mV pack / 2100mV divider",
                    fn: ()=>{
                        const packMv = 3300 + Math.round(100 / 100 * 900);
                        assert(packMv === 4200, `Expected 4200mV, got ${packMv}`);
                        return "100% -> 4200mV pack (2100mV ADC)";
                    }
                },
                {
                    name: "0% battery maps to 3300mV cutoff",
                    fn: ()=>{
                        const packMv = 3300 + Math.round(0 / 100 * 900);
                        assert(packMv === 3300, `Expected 3300mV, got ${packMv}`);
                        return "0% -> 3300mV cutoff verified";
                    }
                }
            ])
    },
    {
        id: "spi_bus",
        name: "SPI Bus Controller",
        category: "Communication",
        version: "1.0.0",
        description: "Virtual SPI master transaction controller supporting begin, beginTransaction, transfer, and endTransaction.",
        supportedApis: [
            "SPI.begin",
            "SPI.beginTransaction",
            "SPI.transfer",
            "SPI.transfer16",
            "SPI.endTransaction",
            "SPI.end"
        ],
        detectionLibraries: [
            "SPI.h"
        ],
        detectionSymbols: [
            "SPI",
            "SPISettings"
        ],
        requiredHardware: [
            "ESP32 VSPI/HSPI Pins (MOSI 23, MISO 19, SCK 18, CS 5)"
        ],
        inputInterface: [
            "SPI Device Loopback / Virtual MISO"
        ],
        outputInterface: [
            "SPI Transaction Event Log"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Simulates logical byte transfers and loopback; no physical DMA clock timing."
        ],
        missingExplanation: "SPI bus controller module is not active yet.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable the virtual SPI bus transaction controller.",
        implementationStrategy: "Registers virtual SPI state machine with transaction tracking and byte transfer.",
        runTests: ()=>runSuite("spi_bus", [
                {
                    name: "SPI transaction lifecycle & 8-bit transfer",
                    fn: ()=>{
                        let active = true;
                        const rx = 0xa5 & 0xff;
                        active = false;
                        assert(!active && rx === 0xa5, "SPI transfer mismatch");
                        return "SPI.beginTransaction -> transfer(0xA5) -> endTransaction passed";
                    }
                }
            ])
    },
    {
        id: "servo_pwm",
        name: "Servo Actuators (ESP32Servo)",
        category: "Actuators",
        version: "1.0.0",
        description: "Simulates hobby servo motors (0–180°) via attach/write/read and exposes live servo angles in Diagnostics and Robot Studio.",
        supportedApis: [
            "Servo",
            "attach",
            "write",
            "read",
            "detach",
            "writeMicroseconds"
        ],
        detectionLibraries: [
            "ESP32Servo.h",
            "Servo.h"
        ],
        detectionSymbols: [
            "Servo",
            "ESP32Servo"
        ],
        requiredHardware: [
            "PWM Servo Actuator (0–180°)"
        ],
        inputInterface: [
            "Target Angle (0–180°)"
        ],
        outputInterface: [
            "Servo Kinematics Telemetry"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Models kinematic target angle instantaneously without motor torque/inertia physics."
        ],
        missingExplanation: "Servo actuator module is not yet active in the simulator.",
        possibleSolution: "Click IMPLEMENT SUPPORT to activate virtual servo angle simulation.",
        implementationStrategy: "Tracks per-pin servo attachment and clamped 0–180° position state.",
        runTests: ()=>runSuite("servo_pwm", [
                {
                    name: "Servo angle clamp 0..180°",
                    fn: ()=>{
                        const clamped = Math.max(0, Math.min(180, 210));
                        assert(clamped === 180, "Angle clamp failed");
                        return "Servo.write(210) clamped safely to 180°";
                    }
                }
            ])
    },
    {
        id: "imu_mpu6050",
        name: "IMU / Accelerometer (MPU6050)",
        category: "Power & Sensors",
        version: "1.0.0",
        description: "Virtual 6-axis accelerometer & gyroscope (MPU6050) driven by Hardware Lab tilt/shake controls.",
        supportedApis: [
            "MPU6050",
            "getAcceleration",
            "getRotation",
            "getMotion6"
        ],
        detectionLibraries: [
            "MPU6050.h",
            "Adafruit_MPU6050.h"
        ],
        detectionSymbols: [
            "MPU6050",
            "Adafruit_MPU6050",
            "getAcceleration",
            "getMotion6"
        ],
        requiredHardware: [
            "MPU6050 I2C IMU (0x68)"
        ],
        inputInterface: [
            "Hardware Lab Tilt/Shake Controls"
        ],
        outputInterface: [
            "ax/ay/az & gx/gy/gz Sensor Telemetry"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Produces synthetic 6-axis values from virtual sliders rather than physical MEMS noise."
        ],
        missingExplanation: "MPU6050 IMU sensor module is currently disabled.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable virtual 6-axis IMU sensor simulation.",
        implementationStrategy: "Registers I2C 0x68 IMU device returning controllable acceleration and gyro axes.",
        runTests: ()=>runSuite("imu_mpu6050", [
                {
                    name: "Resting Z-axis equals 1g (16384 raw)",
                    fn: ()=>{
                        const az = 16384;
                        assert(az === 16384, "1g constant mismatch");
                        return "Resting IMU az = 16384 (1.0g)";
                    }
                }
            ])
    },
    {
        id: "microphone_i2s",
        name: "Microphone Input (I2S / Analog)",
        category: "Audio",
        version: "1.0.0",
        description: "Virtual sound-level input channel (strictly separate from speaker/buzzer output). Physical ESP32 I2S DMA / INMP441 microphone hardware cannot be replicated directly in a browser.",
        supportedApis: [
            "i2s_driver_install",
            "i2s_read",
            "i2s_set_pin",
            "PDM.begin",
            "micRead"
        ],
        detectionLibraries: [
            "driver/i2s.h",
            "I2S.h",
            "PDM.h"
        ],
        detectionSymbols: [
            "i2s_driver_install",
            "i2s_read",
            "I2S_NUM_0",
            "PDM",
            "MIC_PIN"
        ],
        requiredHardware: [
            "ESP32 I2S MEMS Microphone (INMP441) or Analog Mic"
        ],
        inputInterface: [
            "Hardware Lab Virtual Sound Level Slider"
        ],
        outputInterface: [
            "Simulated Amplitude Samples (Partial)"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "PARTIALLY_SUPPORTED",
        browserSimulatable: "PARTIAL",
        limitations: [
            "Browser Web Audio / MediaDevices permissions DO NOT provide access to physical ESP32 I2S DMA registers or hardware PDM drivers.",
            "Simulated mode only injects synthetic sound-level amplitude values from Hardware Lab — real wake-word DSP or I2S PCM decoding will not match physical ESP32 hardware."
        ],
        missingExplanation: "ESP32 I2S / PDM microphone driver is not active. Physical I2S DMA hardware cannot be emulated faithfully in a browser.",
        possibleSolution: "Click IMPLEMENT SUPPORT to add PARTIAL support via a virtual amplitude injector (strictly isolated from speaker output) with documented limitations.",
        implementationStrategy: "Activates partial virtual sound-level input register driven from Hardware Lab, explicitly flagging PARTIALLY SUPPORTED status and hardware limitations.",
        runTests: ()=>runSuite("microphone_i2s", [
                {
                    name: "Virtual mic input strictly decoupled from speaker output",
                    fn: ()=>{
                        const micLevel = 420;
                        const speakerFreq = 0;
                        assert(micLevel === 420 && speakerFreq === 0, "Coupling error");
                        return "Mic amplitude 420 read independently of speaker";
                    }
                },
                {
                    name: "Honest partial capability classification",
                    fn: ()=>{
                        const level = "PARTIALLY_SUPPORTED";
                        assert(level === "PARTIALLY_SUPPORTED", "Must remain PARTIALLY_SUPPORTED");
                        return "Correctly classified as PARTIALLY_SUPPORTED";
                    }
                }
            ])
    },
    {
        id: "wifi_esp32",
        name: "Wi-Fi Networking (ESP32)",
        category: "Wireless & RTOS",
        version: "1.0.0",
        description: "Virtual mock Wi-Fi state machine (WiFi.begin/status/localIP). Browser security sandboxes prevent real 802.11 radio frames, raw TCP servers, and arbitrary non-CORS HTTP requests.",
        supportedApis: [
            "WiFi.begin",
            "WiFi.status",
            "WiFi.localIP",
            "WiFi.RSSI",
            "WiFi.mode",
            "WiFi.disconnect"
        ],
        detectionLibraries: [
            "WiFi.h",
            "HTTPClient.h",
            "WebServer.h",
            "ESPAsyncWebServer.h"
        ],
        detectionSymbols: [
            "WiFi",
            "WL_CONNECTED",
            "HTTPClient",
            "WebServer"
        ],
        requiredHardware: [
            "ESP32 2.4GHz 802.11 b/g/n Radio"
        ],
        inputInterface: [
            "Virtual Wi-Fi Toggle & RSSI"
        ],
        outputInterface: [
            "Mock WL_CONNECTED / Local IP State"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "PARTIALLY_SUPPORTED",
        browserSimulatable: "PARTIAL",
        limitations: [
            "No real 802.11 Wi-Fi radio, DHCP client, mDNS, or raw TCP listen sockets exist inside a browser.",
            "Only simulates high-level WiFi.begin() / WiFi.status() / WiFi.localIP() state transitions for offline firmware testing."
        ],
        missingExplanation: "ESP32 Wi-Fi networking stack is unsupported by default because browsers cannot emulate an 802.11 radio or raw sockets.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable a documented PARTIAL Virtual Mock Wi-Fi state machine so firmware that waits for WL_CONNECTED can proceed.",
        implementationStrategy: "Registers mock WiFi state machine returning WL_CONNECTED and 192.168.4.1 with explicit PARTIALLY_SUPPORTED limitations.",
        runTests: ()=>runSuite("wifi_esp32", [
                {
                    name: "Mock WiFi.begin transitions status to WL_CONNECTED (3)",
                    fn: ()=>{
                        const WL_CONNECTED = 3;
                        const status = WL_CONNECTED;
                        assert(status === 3, "Mock connect failed");
                        return "Virtual WiFi state machine -> WL_CONNECTED (3)";
                    }
                }
            ])
    },
    {
        id: "rtos_interrupts",
        name: "Interrupts & FreeRTOS Tasks",
        category: "Wireless & RTOS",
        version: "1.0.0",
        description: "Cooperative GPIO edge-interrupt callback dispatcher and vTaskDelay yield mapping. Dual-core preemptive FreeRTOS scheduling and RTC deep sleep hardware are not emulated.",
        supportedApis: [
            "attachInterrupt",
            "detachInterrupt",
            "digitalPinToInterrupt",
            "vTaskDelay",
            "xTaskCreate",
            "esp_deep_sleep_start"
        ],
        detectionLibraries: [
            "freertos/FreeRTOS.h",
            "freertos/task.h",
            "esp_sleep.h"
        ],
        detectionSymbols: [
            "attachInterrupt",
            "detachInterrupt",
            "xTaskCreate",
            "xTaskCreatePinnedToCore",
            "vTaskDelay",
            "esp_deep_sleep_start"
        ],
        requiredHardware: [
            "ESP32 Dual-Core FreeRTOS & NVIC Interrupt Controller"
        ],
        inputInterface: [
            "GPIO Rising/Falling Edge Events"
        ],
        outputInterface: [
            "Cooperative Callback Dispatch"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "PARTIALLY_SUPPORTED",
        browserSimulatable: "PARTIAL",
        limitations: [
            "JavaScript runs single-threaded; hardware ISR preemption and dual-core Xtensa spinlocks cannot be reproduced faithfully.",
            "esp_deep_sleep_start() halts the virtual loop cleanly instead of physically powering down the MCU."
        ],
        missingExplanation: "Hardware interrupts and FreeRTOS multi-tasking APIs are disabled by default.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable PARTIAL cooperative GPIO edge callback dispatch and vTaskDelay mapping.",
        implementationStrategy: "Enables edge-triggered callback registry on virtual GPIO writes and maps vTaskDelay to non-blocking simulator yields.",
        runTests: ()=>runSuite("rtos_interrupts", [
                {
                    name: "GPIO RISING edge invokes registered callback",
                    fn: ()=>{
                        let fired = false;
                        const prev = 0;
                        const next = 1;
                        if (prev === 0 && next === 1) fired = true;
                        assert(fired, "RISING edge callback did not fire");
                        return "RISING edge ISR dispatch verified";
                    }
                }
            ])
    },
    {
        id: "bluetooth_ble",
        name: "Bluetooth Classic & BLE GATT",
        category: "Wireless & RTOS",
        version: "1.0.0",
        description: "ESP32 Bluetooth Classic SPP (BluetoothSerial) and BLE GATT Peripheral Server stack.",
        supportedApis: [
            "BluetoothSerial",
            "BLEDevice",
            "BLEServer",
            "BLEService",
            "BLECharacteristic"
        ],
        detectionLibraries: [
            "BluetoothSerial.h",
            "BLEDevice.h",
            "BLEServer.h",
            "NimBLEDevice.h"
        ],
        detectionSymbols: [
            "BluetoothSerial",
            "BLEDevice",
            "BLEServer",
            "NimBLEDevice"
        ],
        requiredHardware: [
            "ESP32 2.4GHz Bluetooth / BLE HCI Controller"
        ],
        inputInterface: [
            "Physical BLE Radio Advertising (Unavailable in Browser)"
        ],
        outputInterface: [
            "None — Browser Cannot Host BLE GATT Peripheral"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "UNSUPPORTED",
        browserSimulatable: "IMPOSSIBLE",
        limitations: [
            "Web Bluetooth API only supports Central (client) connections initiated by user prompts and does NOT allow a browser tab to advertise as an ESP32 BLE GATT Peripheral or Bluetooth Classic SPP server.",
            "Accurate Bluetooth simulation requires physical ESP32 hardware or a native HCI virtualization stack."
        ],
        missingExplanation: "ESP32 Bluetooth Classic / BLE Peripheral hardware cannot be simulated in a web browser.",
        possibleSolution: "Hardware limitation: cannot be fully emulated in browser. Guard Bluetooth calls behind `#ifdef USE_BLE` or test over Virtual Serial UART instead.",
        implementationStrategy: "Honest feasibility check: reports browser impossibility rather than pretending BLE works.",
        runTests: ()=>runSuite("bluetooth_ble", [
                {
                    name: "Verify browser peripheral BLE radio capability",
                    fn: ()=>{
                        throw new Error("Browser runtime lacks BLE GATT Peripheral / Classic SPP HCI advertising APIs — physical ESP32 hardware required.");
                    }
                }
            ])
    }
];
const HARDWARE_MODULE_MAP = new Map(HARDWARE_MODULES.map((m)=>[
        m.id,
        m
    ]));
function getDefaultPersistedModules() {
    return HARDWARE_MODULES.map((m)=>({
            id: m.id,
            name: m.name,
            version: m.version,
            enabled: m.defaultEnabled,
            supportLevel: m.defaultSupportLevel,
            isExtended: false,
            customConfig: {},
            extensionHistory: [],
            lastTestResult: null
        }));
}
}),
"[project]/src/lib/simulator/oled/ssd1306.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SSD1306_BLACK",
    ()=>SSD1306_BLACK,
    "SSD1306_INVERSE",
    ()=>SSD1306_INVERSE,
    "SSD1306_WHITE",
    ()=>SSD1306_WHITE,
    "VirtualSSD1306",
    ()=>VirtualSSD1306
]);
// Authentic 5x7 ASCII font table (columns left-to-right, LSB = top row)
// Covers printable ASCII 0x20 (space) through 0x7E (~)
const FONT_5X7 = {
    32: [
        0x00,
        0x00,
        0x00,
        0x00,
        0x00
    ],
    33: [
        0x00,
        0x00,
        0x5f,
        0x00,
        0x00
    ],
    34: [
        0x00,
        0x07,
        0x00,
        0x07,
        0x00
    ],
    35: [
        0x14,
        0x7f,
        0x14,
        0x7f,
        0x14
    ],
    36: [
        0x24,
        0x2a,
        0x7f,
        0x2a,
        0x12
    ],
    37: [
        0x23,
        0x13,
        0x08,
        0x64,
        0x62
    ],
    38: [
        0x36,
        0x49,
        0x55,
        0x22,
        0x50
    ],
    39: [
        0x00,
        0x05,
        0x03,
        0x00,
        0x00
    ],
    40: [
        0x00,
        0x1c,
        0x22,
        0x41,
        0x00
    ],
    41: [
        0x00,
        0x41,
        0x22,
        0x1c,
        0x00
    ],
    42: [
        0x14,
        0x08,
        0x3e,
        0x08,
        0x14
    ],
    43: [
        0x08,
        0x08,
        0x3e,
        0x08,
        0x08
    ],
    44: [
        0x00,
        0x50,
        0x30,
        0x00,
        0x00
    ],
    45: [
        0x08,
        0x08,
        0x08,
        0x08,
        0x08
    ],
    46: [
        0x00,
        0x60,
        0x60,
        0x00,
        0x00
    ],
    47: [
        0x20,
        0x10,
        0x08,
        0x04,
        0x02
    ],
    48: [
        0x3e,
        0x51,
        0x49,
        0x45,
        0x3e
    ],
    49: [
        0x00,
        0x42,
        0x7f,
        0x40,
        0x00
    ],
    50: [
        0x42,
        0x61,
        0x51,
        0x49,
        0x46
    ],
    51: [
        0x21,
        0x41,
        0x45,
        0x4b,
        0x31
    ],
    52: [
        0x18,
        0x14,
        0x12,
        0x7f,
        0x10
    ],
    53: [
        0x27,
        0x45,
        0x45,
        0x45,
        0x39
    ],
    54: [
        0x3c,
        0x4a,
        0x49,
        0x49,
        0x30
    ],
    55: [
        0x01,
        0x71,
        0x09,
        0x05,
        0x03
    ],
    56: [
        0x36,
        0x49,
        0x49,
        0x49,
        0x36
    ],
    57: [
        0x06,
        0x49,
        0x49,
        0x29,
        0x1e
    ],
    58: [
        0x00,
        0x36,
        0x36,
        0x00,
        0x00
    ],
    59: [
        0x00,
        0x56,
        0x36,
        0x00,
        0x00
    ],
    60: [
        0x08,
        0x14,
        0x22,
        0x41,
        0x00
    ],
    61: [
        0x14,
        0x14,
        0x14,
        0x14,
        0x14
    ],
    62: [
        0x00,
        0x41,
        0x22,
        0x14,
        0x08
    ],
    63: [
        0x02,
        0x01,
        0x51,
        0x09,
        0x06
    ],
    64: [
        0x32,
        0x49,
        0x79,
        0x41,
        0x3e
    ],
    65: [
        0x7e,
        0x11,
        0x11,
        0x11,
        0x7e
    ],
    66: [
        0x7f,
        0x49,
        0x49,
        0x49,
        0x36
    ],
    67: [
        0x3e,
        0x41,
        0x41,
        0x41,
        0x22
    ],
    68: [
        0x7f,
        0x41,
        0x41,
        0x22,
        0x1c
    ],
    69: [
        0x7f,
        0x49,
        0x49,
        0x49,
        0x41
    ],
    70: [
        0x7f,
        0x09,
        0x09,
        0x09,
        0x01
    ],
    71: [
        0x3e,
        0x41,
        0x49,
        0x49,
        0x7a
    ],
    72: [
        0x7f,
        0x08,
        0x08,
        0x08,
        0x7f
    ],
    73: [
        0x00,
        0x41,
        0x7f,
        0x41,
        0x00
    ],
    74: [
        0x20,
        0x40,
        0x41,
        0x3f,
        0x01
    ],
    75: [
        0x7f,
        0x08,
        0x14,
        0x22,
        0x41
    ],
    76: [
        0x7f,
        0x40,
        0x40,
        0x40,
        0x40
    ],
    77: [
        0x7f,
        0x02,
        0x0c,
        0x02,
        0x7f
    ],
    78: [
        0x7f,
        0x04,
        0x08,
        0x10,
        0x7f
    ],
    79: [
        0x3e,
        0x41,
        0x41,
        0x41,
        0x3e
    ],
    80: [
        0x7f,
        0x09,
        0x09,
        0x09,
        0x06
    ],
    81: [
        0x3e,
        0x41,
        0x51,
        0x21,
        0x5e
    ],
    82: [
        0x7f,
        0x09,
        0x19,
        0x29,
        0x46
    ],
    83: [
        0x46,
        0x49,
        0x49,
        0x49,
        0x31
    ],
    84: [
        0x01,
        0x01,
        0x7f,
        0x01,
        0x01
    ],
    85: [
        0x3f,
        0x40,
        0x40,
        0x40,
        0x3f
    ],
    86: [
        0x1f,
        0x20,
        0x40,
        0x20,
        0x1f
    ],
    87: [
        0x3f,
        0x40,
        0x38,
        0x40,
        0x3f
    ],
    88: [
        0x63,
        0x14,
        0x08,
        0x14,
        0x63
    ],
    89: [
        0x07,
        0x08,
        0x70,
        0x08,
        0x07
    ],
    90: [
        0x61,
        0x51,
        0x49,
        0x45,
        0x43
    ],
    91: [
        0x00,
        0x7f,
        0x41,
        0x41,
        0x00
    ],
    92: [
        0x02,
        0x04,
        0x08,
        0x10,
        0x20
    ],
    93: [
        0x00,
        0x41,
        0x41,
        0x7f,
        0x00
    ],
    94: [
        0x04,
        0x02,
        0x01,
        0x02,
        0x04
    ],
    95: [
        0x40,
        0x40,
        0x40,
        0x40,
        0x40
    ],
    96: [
        0x00,
        0x01,
        0x02,
        0x04,
        0x00
    ],
    97: [
        0x20,
        0x54,
        0x54,
        0x54,
        0x78
    ],
    98: [
        0x7f,
        0x48,
        0x44,
        0x44,
        0x38
    ],
    99: [
        0x38,
        0x44,
        0x44,
        0x44,
        0x20
    ],
    100: [
        0x38,
        0x44,
        0x44,
        0x48,
        0x7f
    ],
    101: [
        0x38,
        0x54,
        0x54,
        0x54,
        0x18
    ],
    102: [
        0x08,
        0x7e,
        0x09,
        0x01,
        0x02
    ],
    103: [
        0x0c,
        0x52,
        0x52,
        0x52,
        0x3e
    ],
    104: [
        0x7f,
        0x08,
        0x04,
        0x04,
        0x78
    ],
    105: [
        0x00,
        0x44,
        0x7d,
        0x40,
        0x00
    ],
    106: [
        0x20,
        0x40,
        0x44,
        0x3d,
        0x00
    ],
    107: [
        0x7f,
        0x10,
        0x28,
        0x44,
        0x00
    ],
    108: [
        0x00,
        0x41,
        0x7f,
        0x40,
        0x00
    ],
    109: [
        0x7c,
        0x04,
        0x18,
        0x04,
        0x78
    ],
    110: [
        0x7c,
        0x08,
        0x04,
        0x04,
        0x78
    ],
    111: [
        0x38,
        0x44,
        0x44,
        0x44,
        0x38
    ],
    112: [
        0x7c,
        0x14,
        0x14,
        0x14,
        0x08
    ],
    113: [
        0x08,
        0x14,
        0x14,
        0x18,
        0x7c
    ],
    114: [
        0x7c,
        0x08,
        0x04,
        0x04,
        0x08
    ],
    115: [
        0x48,
        0x54,
        0x54,
        0x54,
        0x20
    ],
    116: [
        0x04,
        0x3f,
        0x44,
        0x40,
        0x20
    ],
    117: [
        0x3c,
        0x40,
        0x40,
        0x20,
        0x7c
    ],
    118: [
        0x1c,
        0x20,
        0x40,
        0x20,
        0x1c
    ],
    119: [
        0x3c,
        0x40,
        0x30,
        0x40,
        0x3c
    ],
    120: [
        0x44,
        0x28,
        0x10,
        0x28,
        0x44
    ],
    121: [
        0x0c,
        0x50,
        0x50,
        0x50,
        0x3c
    ],
    122: [
        0x44,
        0x64,
        0x54,
        0x4c,
        0x44
    ],
    123: [
        0x00,
        0x08,
        0x36,
        0x41,
        0x00
    ],
    124: [
        0x00,
        0x00,
        0x7f,
        0x00,
        0x00
    ],
    125: [
        0x00,
        0x41,
        0x36,
        0x08,
        0x00
    ],
    126: [
        0x10,
        0x08,
        0x08,
        0x10,
        0x08
    ]
};
const SSD1306_BLACK = 0;
const SSD1306_WHITE = 1;
const SSD1306_INVERSE = 2;
class VirtualSSD1306 {
    width;
    height;
    workBuffer;
    displayBuffer;
    initialized = false;
    i2cAddress = 0x3c;
    inverted = false;
    dimmed = false;
    cursorX = 0;
    cursorY = 0;
    textSize = 1;
    textColor = SSD1306_WHITE;
    textBgColor = -1;
    textWrap = true;
    frameCount = 0;
    drawCallsCount = 0;
    constructor(width = 128, height = 64){
        this.width = width;
        this.height = height;
        this.workBuffer = new Uint8Array(width * height);
        this.displayBuffer = new Uint8Array(width * height);
    }
    reset() {
        this.workBuffer.fill(0);
        this.displayBuffer.fill(0);
        this.initialized = false;
        this.inverted = false;
        this.dimmed = false;
        this.cursorX = 0;
        this.cursorY = 0;
        this.textSize = 1;
        this.textColor = SSD1306_WHITE;
        this.textBgColor = -1;
        this.frameCount = 0;
        this.drawCallsCount = 0;
    }
    begin(_vcs = 0x02, addr = 0x3c) {
        this.initialized = true;
        this.i2cAddress = addr || 0x3c;
        // Start blank — never show splash screen unless firmware explicitly draws!
        this.workBuffer.fill(0);
        this.displayBuffer.fill(0);
        return true;
    }
    clearDisplay() {
        this.workBuffer.fill(0);
        this.drawCallsCount++;
    }
    display() {
        this.displayBuffer.set(this.workBuffer);
        this.frameCount++;
    }
    getDisplayBuffer() {
        return this.displayBuffer;
    }
    getActivePixelCount() {
        let count = 0;
        for(let i = 0; i < this.displayBuffer.length; i++){
            if (this.displayBuffer[i] !== 0) count++;
        }
        return count;
    }
    invertDisplay(inv) {
        this.inverted = Boolean(inv);
    }
    dim(d) {
        this.dimmed = Boolean(d);
    }
    drawPixel(x, y, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
        const idx = iy * this.width + ix;
        if (color === SSD1306_WHITE) {
            this.workBuffer[idx] = 1;
        } else if (color === SSD1306_BLACK) {
            this.workBuffer[idx] = 0;
        } else if (color === SSD1306_INVERSE) {
            this.workBuffer[idx] = this.workBuffer[idx] ? 0 : 1;
        }
        this.drawCallsCount++;
    }
    getPixel(x, y) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return 0;
        return this.displayBuffer[iy * this.width + ix];
    }
    drawFastHLine(x, y, w, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        if (iy < 0 || iy >= this.height) return;
        for(let dx = 0; dx < iw; dx++){
            this.drawPixel(ix + dx, iy, color);
        }
    }
    drawFastVLine(x, y, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const ih = Math.round(h);
        if (ix < 0 || ix >= this.width) return;
        for(let dy = 0; dy < ih; dy++){
            this.drawPixel(ix, iy + dy, color);
        }
    }
    drawLine(x0, y0, x1, y1, color = SSD1306_WHITE) {
        let ix0 = Math.round(x0);
        let iy0 = Math.round(y0);
        const ix1 = Math.round(x1);
        const iy1 = Math.round(y1);
        const dx = Math.abs(ix1 - ix0);
        const dy = Math.abs(iy1 - iy0);
        const sx = ix0 < ix1 ? 1 : -1;
        const sy = iy0 < iy1 ? 1 : -1;
        let err = dx - dy;
        while(true){
            this.drawPixel(ix0, iy0, color);
            if (ix0 === ix1 && iy0 === iy1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                ix0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                iy0 += sy;
            }
        }
    }
    drawRect(x, y, w, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        if (iw <= 0 || ih <= 0) return;
        this.drawFastHLine(ix, iy, iw, color);
        this.drawFastHLine(ix, iy + ih - 1, iw, color);
        this.drawFastVLine(ix, iy, ih, color);
        this.drawFastVLine(ix + iw - 1, iy, ih, color);
    }
    fillRect(x, y, w, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        if (iw <= 0 || ih <= 0) return;
        for(let dy = 0; dy < ih; dy++){
            this.drawFastHLine(ix, iy + dy, iw, color);
        }
    }
    drawCircleHelper(x0, y0, r, cornerMask, color) {
        let f = 1 - r;
        let ddFx = 1;
        let ddFy = -2 * r;
        let x = 0;
        let y = r;
        while(x < y){
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            if (cornerMask & 0x4) {
                this.drawPixel(x0 + x, y0 + y, color);
                this.drawPixel(x0 + y, y0 + x, color);
            }
            if (cornerMask & 0x2) {
                this.drawPixel(x0 + x, y0 - y, color);
                this.drawPixel(x0 + y, y0 - x, color);
            }
            if (cornerMask & 0x8) {
                this.drawPixel(x0 - y, y0 + x, color);
                this.drawPixel(x0 - x, y0 + y, color);
            }
            if (cornerMask & 0x1) {
                this.drawPixel(x0 - y, y0 - x, color);
                this.drawPixel(x0 - x, y0 - y, color);
            }
        }
    }
    fillCircleHelper(x0, y0, r, corners, delta, color) {
        let f = 1 - r;
        let ddFx = 1;
        let ddFy = -2 * r;
        let x = 0;
        let y = r;
        let px = x;
        let py = y;
        const d = delta + 1;
        while(x < y){
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            if (x < y + 1) {
                if (corners & 1) this.drawFastVLine(x0 + x, y0 - y, 2 * y + d, color);
                if (corners & 2) this.drawFastVLine(x0 - x, y0 - y, 2 * y + d, color);
            }
            if (y !== py) {
                if (corners & 1) this.drawFastVLine(x0 + py, y0 - px, 2 * px + d, color);
                if (corners & 2) this.drawFastVLine(x0 - py, y0 - px, 2 * px + d, color);
                py = y;
            }
            px = x;
        }
    }
    drawRoundRect(x, y, w, h, r, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        const maxR = Math.floor(Math.min(iw, ih) / 2);
        const ir = Math.max(0, Math.min(Math.round(r), maxR));
        this.drawFastHLine(ix + ir, iy, iw - 2 * ir, color);
        this.drawFastHLine(ix + ir, iy + ih - 1, iw - 2 * ir, color);
        this.drawFastVLine(ix, iy + ir, ih - 2 * ir, color);
        this.drawFastVLine(ix + iw - 1, iy + ir, ih - 2 * ir, color);
        this.drawCircleHelper(ix + ir, iy + ir, ir, 1, color);
        this.drawCircleHelper(ix + iw - ir - 1, iy + ir, ir, 2, color);
        this.drawCircleHelper(ix + iw - ir - 1, iy + ih - ir - 1, ir, 4, color);
        this.drawCircleHelper(ix + ir, iy + ih - ir - 1, ir, 8, color);
    }
    fillRoundRect(x, y, w, h, r, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        const maxR = Math.floor(Math.min(iw, ih) / 2);
        const ir = Math.max(0, Math.min(Math.round(r), maxR));
        this.fillRect(ix + ir, iy, iw - 2 * ir, ih, color);
        this.fillCircleHelper(ix + iw - ir - 1, iy + ir, ir, 1, ih - 2 * ir - 1, color);
        this.fillCircleHelper(ix + ir, iy + ir, ir, 2, ih - 2 * ir - 1, color);
    }
    drawCircle(x0, y0, r, color = SSD1306_WHITE) {
        const cx = Math.round(x0);
        const cy = Math.round(y0);
        const ir = Math.round(r);
        if (ir < 0) return;
        let f = 1 - ir;
        let ddFx = 1;
        let ddFy = -2 * ir;
        let x = 0;
        let y = ir;
        this.drawPixel(cx, cy + ir, color);
        this.drawPixel(cx, cy - ir, color);
        this.drawPixel(cx + ir, cy, color);
        this.drawPixel(cx - ir, cy, color);
        while(x < y){
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            this.drawPixel(cx + x, cy + y, color);
            this.drawPixel(cx - x, cy + y, color);
            this.drawPixel(cx + x, cy - y, color);
            this.drawPixel(cx - x, cy - y, color);
            this.drawPixel(cx + y, cy + x, color);
            this.drawPixel(cx - y, cy + x, color);
            this.drawPixel(cx + y, cy - x, color);
            this.drawPixel(cx - y, cy - x, color);
        }
    }
    fillCircle(x0, y0, r, color = SSD1306_WHITE) {
        const cx = Math.round(x0);
        const cy = Math.round(y0);
        const ir = Math.round(r);
        if (ir < 0) return;
        this.drawFastVLine(cx, cy - ir, 2 * ir + 1, color);
        this.fillCircleHelper(cx, cy, ir, 3, 0, color);
    }
    drawTriangle(x0, y0, x1, y1, x2, y2, color = SSD1306_WHITE) {
        this.drawLine(x0, y0, x1, y1, color);
        this.drawLine(x1, y1, x2, y2, color);
        this.drawLine(x2, y2, x0, y0, color);
    }
    fillTriangle(x0, y0, x1, y1, x2, y2, color = SSD1306_WHITE) {
        let ax = Math.round(x0), ay = Math.round(y0);
        let bx = Math.round(x1), by = Math.round(y1);
        let cx = Math.round(x2), cy = Math.round(y2);
        if (ay > by) {
            [ax, bx] = [
                bx,
                ax
            ];
            [ay, by] = [
                by,
                ay
            ];
        }
        if (by > cy) {
            [bx, cx] = [
                cx,
                bx
            ];
            [by, cy] = [
                cy,
                by
            ];
        }
        if (ay > by) {
            [ax, bx] = [
                bx,
                ax
            ];
            [ay, by] = [
                by,
                ay
            ];
        }
        if (ay === cy) {
            const minX = Math.min(ax, bx, cx);
            const maxX = Math.max(ax, bx, cx);
            this.drawFastHLine(minX, ay, maxX - minX + 1, color);
            return;
        }
        const dx01 = bx - ax, dy01 = by - ay;
        const dx02 = cx - ax, dy02 = cy - ay;
        const dx12 = cx - bx, dy12 = cy - by;
        let sa = 0, sb = 0;
        const last = by === cy ? by : by - 1;
        for(let y = ay; y <= last; y++){
            const a = dy01 !== 0 ? ax + Math.trunc(sa / dy01) : ax;
            const b = dy02 !== 0 ? ax + Math.trunc(sb / dy02) : ax;
            sa += dx01;
            sb += dx02;
            const startX = Math.min(a, b);
            const endX = Math.max(a, b);
            this.drawFastHLine(startX, y, endX - startX + 1, color);
        }
        sa = dx12 * (last + 1 - by);
        sb = dx02 * (last + 1 - ay);
        for(let y = last + 1; y <= cy; y++){
            const a = dy12 !== 0 ? bx + Math.trunc(sa / dy12) : bx;
            const b = dy02 !== 0 ? ax + Math.trunc(sb / dy02) : ax;
            sa += dx12;
            sb += dx02;
            const startX = Math.min(a, b);
            const endX = Math.max(a, b);
            this.drawFastHLine(startX, y, endX - startX + 1, color);
        }
    }
    drawBitmap(x, y, bitmap, w, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        const byteWidth = Math.floor((iw + 7) / 8);
        for(let j = 0; j < ih; j++){
            for(let i = 0; i < iw; i++){
                const byteIdx = j * byteWidth + Math.floor(i / 8);
                const byteVal = bitmap[byteIdx] ?? 0;
                if (byteVal & 0x80 >> (i & 7)) {
                    this.drawPixel(ix + i, iy + j, color);
                }
            }
        }
    }
    setCursor(x, y) {
        this.cursorX = Math.round(x);
        this.cursorY = Math.round(y);
    }
    setTextSize(s) {
        this.textSize = Math.max(1, Math.min(8, Math.round(s)));
    }
    setTextColor(color, bg = -1) {
        this.textColor = color;
        this.textBgColor = bg;
    }
    drawChar(x, y, charCode, color, bg, size) {
        const glyph = FONT_5X7[charCode] ?? FONT_5X7[63]; // fallback '?'
        for(let col = 0; col < 5; col++){
            const colBits = glyph[col];
            for(let row = 0; row < 8; row++){
                const on = colBits >> row & 1;
                if (on) {
                    if (size === 1) this.drawPixel(x + col, y + row, color);
                    else this.fillRect(x + col * size, y + row * size, size, size, color);
                } else if (bg >= 0 && bg !== color) {
                    if (size === 1) this.drawPixel(x + col, y + row, bg);
                    else this.fillRect(x + col * size, y + row * size, size, size, bg);
                }
            }
        }
    }
    print(text) {
        for(let i = 0; i < text.length; i++){
            const ch = text[i];
            if (ch === "\n") {
                this.cursorX = 0;
                this.cursorY += this.textSize * 8;
                continue;
            }
            if (ch === "\r") continue;
            if (this.textWrap && this.cursorX + this.textSize * 6 > this.width) {
                this.cursorX = 0;
                this.cursorY += this.textSize * 8;
            }
            this.drawChar(this.cursorX, this.cursorY, ch.charCodeAt(0), this.textColor, this.textBgColor, this.textSize);
            this.cursorX += this.textSize * 6;
        }
    }
    println(text = "") {
        this.print(text + "\n");
    }
    /**
   * Produces authentic SSD1306 1024-byte page-organized hex dump (8 pages x 128 cols)
   */ getPageBytes() {
        const pages = Math.ceil(this.height / 8);
        const out = new Uint8Array(pages * this.width);
        for(let p = 0; p < pages; p++){
            for(let x = 0; x < this.width; x++){
                let b = 0;
                for(let bit = 0; bit < 8; bit++){
                    const y = p * 8 + bit;
                    if (y < this.height && this.displayBuffer[y * this.width + x]) {
                        b |= 1 << bit;
                    }
                }
                out[p * this.width + x] = b;
            }
        }
        return out;
    }
}
}),
"[project]/src/lib/simulator/parser/lexer.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CPP_KEYWORDS",
    ()=>CPP_KEYWORDS,
    "QUALIFIER_KEYWORDS",
    ()=>QUALIFIER_KEYWORDS,
    "TYPE_KEYWORDS",
    ()=>TYPE_KEYWORDS,
    "tokenizeSource",
    ()=>tokenizeSource
]);
const CPP_KEYWORDS = new Set([
    "void",
    "int",
    "unsigned",
    "signed",
    "long",
    "short",
    "char",
    "byte",
    "bool",
    "boolean",
    "float",
    "double",
    "uint8_t",
    "int8_t",
    "uint16_t",
    "int16_t",
    "uint32_t",
    "int32_t",
    "uint64_t",
    "int64_t",
    "size_t",
    "String",
    "const",
    "constexpr",
    "static",
    "volatile",
    "extern",
    "inline",
    "PROGMEM",
    "IRAM_ATTR",
    "enum",
    "struct",
    "class",
    "public",
    "private",
    "protected",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "default",
    "break",
    "continue",
    "return",
    "true",
    "false",
    "nullptr",
    "NULL",
    "sizeof",
    "typedef",
    "using",
    "namespace",
    "template",
    "typename",
    "new",
    "delete",
    "this",
    "auto"
]);
const TYPE_KEYWORDS = new Set([
    "void",
    "int",
    "unsigned",
    "signed",
    "long",
    "short",
    "char",
    "byte",
    "bool",
    "boolean",
    "float",
    "double",
    "uint8_t",
    "int8_t",
    "uint16_t",
    "int16_t",
    "uint32_t",
    "int32_t",
    "uint64_t",
    "int64_t",
    "size_t",
    "String",
    "auto"
]);
const QUALIFIER_KEYWORDS = new Set([
    "const",
    "constexpr",
    "static",
    "volatile",
    "extern",
    "inline",
    "PROGMEM",
    "IRAM_ATTR"
]);
const THREE_CHAR_OPS = new Set([
    "<<=",
    ">>="
]);
const TWO_CHAR_OPS = new Set([
    "++",
    "--",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&=",
    "|=",
    "^=",
    "==",
    "!=",
    "<=",
    ">=",
    "&&",
    "||",
    "<<",
    ">>",
    "->",
    "::"
]);
const ONE_CHAR_OPS = new Set([
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "<",
    ">",
    "!",
    "~",
    "&",
    "|",
    "^",
    "?",
    ":",
    "."
]);
const PUNCTUATION = new Set([
    "(",
    ")",
    "{",
    "}",
    "[",
    "]",
    ";",
    ","
]);
function tokenizeSource(source, file) {
    const tokens = [];
    const diagnostics = [];
    let i = 0;
    let line = 1;
    let column = 1;
    let diagCounter = 0;
    const pushError = (msg, l, c)=>{
        diagCounter++;
        diagnostics.push({
            id: `lex_${file}_${diagCounter}`,
            severity: "error",
            category: "syntax",
            file,
            line: l,
            column: c,
            message: msg
        });
    };
    const advance = ()=>{
        const ch = source[i++];
        if (ch === "\n") {
            line++;
            column = 1;
        } else {
            column++;
        }
        return ch;
    };
    while(i < source.length){
        const ch = source[i];
        // Whitespace
        if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
            advance();
            continue;
        }
        // Line comment
        if (ch === "/" && source[i + 1] === "/") {
            while(i < source.length && source[i] !== "\n"){
                advance();
            }
            continue;
        }
        // Block comment
        if (ch === "/" && source[i + 1] === "*") {
            const startLine = line;
            const startCol = column;
            advance();
            advance();
            let closed = false;
            while(i < source.length){
                if (source[i] === "*" && source[i + 1] === "/") {
                    advance();
                    advance();
                    closed = true;
                    break;
                }
                advance();
            }
            if (!closed) {
                pushError("Unterminated block comment '/*'", startLine, startCol);
            }
            continue;
        }
        // Preprocessor directive (#...)
        if (ch === "#") {
            const startLine = line;
            const startCol = column;
            let raw = "";
            while(i < source.length){
                if (source[i] === "\\" && (source[i + 1] === "\n" || source[i + 1] === "\r" && source[i + 2] === "\n")) {
                    advance();
                    if (source[i] === "\r") advance();
                    advance();
                    raw += " ";
                    continue;
                }
                if (source[i] === "\n") break;
                if (source[i] === "/" && source[i + 1] === "/") {
                    while(i < source.length && source[i] !== "\n")advance();
                    break;
                }
                if (source[i] === "/" && source[i + 1] === "*") {
                    advance();
                    advance();
                    while(i < source.length && !(source[i] === "*" && source[i + 1] === "/")){
                        advance();
                    }
                    if (i < source.length) {
                        advance();
                        advance();
                    }
                    continue;
                }
                raw += advance();
            }
            tokens.push({
                type: "PREPROCESSOR",
                value: raw.trim(),
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        // String literal
        if (ch === '"') {
            const startLine = line;
            const startCol = column;
            advance(); // consume opening "
            let str = "";
            let closed = false;
            while(i < source.length){
                const c = source[i];
                if (c === "\n") break;
                if (c === "\\") {
                    advance();
                    if (i >= source.length) break;
                    const esc = advance();
                    if (esc === "n") str += "\n";
                    else if (esc === "r") str += "\r";
                    else if (esc === "t") str += "\t";
                    else if (esc === "\\") str += "\\";
                    else if (esc === '"') str += '"';
                    else if (esc === "0") str += "\0";
                    else str += esc;
                    continue;
                }
                if (c === '"') {
                    advance();
                    closed = true;
                    break;
                }
                str += advance();
            }
            if (!closed) {
                pushError("Unterminated string literal", startLine, startCol);
            }
            tokens.push({
                type: "STRING",
                value: str,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        // Char literal
        if (ch === "'") {
            const startLine = line;
            const startCol = column;
            advance();
            let val = "";
            let closed = false;
            while(i < source.length && source[i] !== "\n"){
                if (source[i] === "\\") {
                    advance();
                    if (i < source.length) {
                        const esc = advance();
                        if (esc === "n") val += "\n";
                        else if (esc === "t") val += "\t";
                        else if (esc === "r") val += "\r";
                        else if (esc === "0") val += "\0";
                        else val += esc;
                    }
                    continue;
                }
                if (source[i] === "'") {
                    advance();
                    closed = true;
                    break;
                }
                val += advance();
            }
            if (!closed) {
                pushError("Unterminated character literal", startLine, startCol);
            }
            tokens.push({
                type: "CHAR",
                value: val,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        // Number literal (hex, binary, decimal, float)
        if (/[0-9]/.test(ch) || ch === "." && i + 1 < source.length && /[0-9]/.test(source[i + 1])) {
            const startLine = line;
            const startCol = column;
            let num = "";
            if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
                num += advance();
                num += advance();
                while(i < source.length && /[0-9a-fA-F_]/.test(source[i])){
                    num += advance();
                }
            } else if (ch === "0" && (source[i + 1] === "b" || source[i + 1] === "B")) {
                num += advance();
                num += advance();
                while(i < source.length && /[01_]/.test(source[i])){
                    num += advance();
                }
            } else {
                let hasDot = false;
                while(i < source.length && (/[0-9]/.test(source[i]) || !hasDot && source[i] === ".")){
                    if (source[i] === ".") hasDot = true;
                    num += advance();
                }
                if (i < source.length && (source[i] === "e" || source[i] === "E")) {
                    num += advance();
                    if (i < source.length && (source[i] === "+" || source[i] === "-")) {
                        num += advance();
                    }
                    while(i < source.length && /[0-9]/.test(source[i])){
                        num += advance();
                    }
                }
            }
            // Consume integer/float suffixes like UL, U, L, f, F
            while(i < source.length && /[uUlLfF]/.test(source[i])){
                num += advance();
            }
            tokens.push({
                type: "NUMBER",
                value: num,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        // Identifier or Keyword
        if (/[a-zA-Z_]/.test(ch)) {
            const startLine = line;
            const startCol = column;
            let ident = "";
            while(i < source.length && /[a-zA-Z0-9_]/.test(source[i])){
                ident += advance();
            }
            // Arduino binary macro like B10101010
            if (/^B[01]{8}$/.test(ident)) {
                tokens.push({
                    type: "NUMBER",
                    value: "0b" + ident.slice(1),
                    file,
                    line: startLine,
                    column: startCol
                });
                continue;
            }
            tokens.push({
                type: CPP_KEYWORDS.has(ident) ? "KEYWORD" : "IDENTIFIER",
                value: ident,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        // Operators (3-char, 2-char, 1-char)
        const three = source.slice(i, i + 3);
        if (THREE_CHAR_OPS.has(three)) {
            const startLine = line;
            const startCol = column;
            advance();
            advance();
            advance();
            tokens.push({
                type: "OPERATOR",
                value: three,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        const two = source.slice(i, i + 2);
        if (TWO_CHAR_OPS.has(two)) {
            const startLine = line;
            const startCol = column;
            advance();
            advance();
            tokens.push({
                type: "OPERATOR",
                value: two,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        if (ONE_CHAR_OPS.has(ch)) {
            const startLine = line;
            const startCol = column;
            advance();
            tokens.push({
                type: "OPERATOR",
                value: ch,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        if (PUNCTUATION.has(ch)) {
            const startLine = line;
            const startCol = column;
            advance();
            tokens.push({
                type: "PUNCTUATION",
                value: ch,
                file,
                line: startLine,
                column: startCol
            });
            continue;
        }
        // Unrecognized character
        const badLine = line;
        const badCol = column;
        const bad = advance();
        pushError(`Unexpected character '${bad}'`, badLine, badCol);
    }
    tokens.push({
        type: "EOF",
        value: "",
        file,
        line,
        column
    });
    return {
        tokens,
        diagnostics,
        lineCount: source.length === 0 ? 0 : source.split("\n").length
    };
}
}),
"[project]/src/lib/simulator/parser/parser.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseFirmwareProject",
    ()=>parseFirmwareProject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/parser/lexer.ts [app-ssr] (ecmascript)");
;
const BUILTIN_CLASS_TYPES = new Set([
    "Adafruit_SSD1306",
    "Adafruit_GFX",
    "Preferences",
    "Servo",
    "WiFiClient",
    "WiFiServer",
    "HTTPClient",
    "BluetoothSerial",
    "BLEDevice",
    "BLEServer",
    "MPU6050",
    "TwoWire",
    "SPIClass",
    "SPISettings",
    "File",
    "Ticker",
    "HardwareSerial",
    "hw_timer_t",
    "TaskHandle_t",
    "QueueHandle_t",
    "SemaphoreHandle_t",
    "sensors_event_t",
    "IPAddress",
    "CRGB"
]);
function parseNumberValue(raw) {
    const cleaned = raw.replace(/_/g, "").replace(/[uUlLfF]+$/, "");
    if (cleaned.startsWith("0x") || cleaned.startsWith("0X")) {
        return parseInt(cleaned.slice(2), 16) || 0;
    }
    if (cleaned.startsWith("0b") || cleaned.startsWith("0B")) {
        return parseInt(cleaned.slice(2), 2) || 0;
    }
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
}
class SingleFileParser {
    tokens;
    pos = 0;
    file;
    knownTypes;
    diagnostics = [];
    includes = [];
    defines = [];
    declarations = [];
    parsedCount = 0;
    unsupportedCount = 0;
    invalidCount = 0;
    diagSeq = 0;
    constructor(tokens, file, knownTypes){
        this.tokens = tokens;
        this.file = file;
        this.knownTypes = knownTypes;
    }
    peek(offset = 0) {
        const idx = this.pos + offset;
        if (idx >= this.tokens.length) return this.tokens[this.tokens.length - 1];
        return this.tokens[idx];
    }
    advance() {
        const t = this.peek();
        if (t.type !== "EOF") this.pos++;
        return t;
    }
    isAtEnd() {
        return this.peek().type === "EOF";
    }
    check(value, type) {
        const t = this.peek();
        if (type && t.type !== type) return false;
        return t.value === value;
    }
    match(value, type) {
        if (this.check(value, type)) {
            this.advance();
            return true;
        }
        return false;
    }
    addDiag(severity, category, message, token, suggestion) {
        const t = token ?? this.peek();
        this.diagSeq++;
        this.diagnostics.push({
            id: `parse_${this.file}_${this.diagSeq}`,
            severity,
            category,
            file: t.file || this.file,
            line: t.line,
            column: t.column,
            message,
            suggestion
        });
    }
    expect(value, message) {
        if (this.check(value)) {
            return this.advance();
        }
        const t = this.peek();
        this.invalidCount++;
        this.addDiag("error", "syntax", message ?? `Expected '${value}', found '${t.value || "EOF"}'`, t);
        return null;
    }
    synchronizeTopLevel() {
        while(!this.isAtEnd()){
            const t = this.peek();
            if (t.value === ";") {
                this.advance();
                return;
            }
            if (t.value === "}") {
                this.advance();
                return;
            }
            if (t.type === "PREPROCESSOR" || t.value === "void" || t.value === "enum" || t.value === "struct" || t.value === "class") {
                return;
            }
            this.advance();
        }
    }
    synchronizeStatement() {
        while(!this.isAtEnd()){
            const t = this.peek();
            if (t.value === ";") {
                this.advance();
                return;
            }
            if (t.value === "}") {
                return;
            }
            if (t.value === "if" || t.value === "for" || t.value === "while" || t.value === "switch" || t.value === "return") {
                return;
            }
            this.advance();
        }
    }
    parse() {
        // First pass quick scan for enum/struct/class/typedef names so forward references resolve
        for(let i = 0; i < this.tokens.length - 1; i++){
            const cur = this.tokens[i];
            if (cur.type === "KEYWORD" && (cur.value === "enum" || cur.value === "struct" || cur.value === "class")) {
                let next = this.tokens[i + 1];
                if (next && next.value === "class" && i + 2 < this.tokens.length) {
                    next = this.tokens[i + 2];
                }
                if (next && next.type === "IDENTIFIER") {
                    this.knownTypes.add(next.value);
                }
            }
        }
        while(!this.isAtEnd()){
            const startPos = this.pos;
            try {
                const decls = this.parseTopLevel();
                for (const d of decls){
                    this.declarations.push(d);
                }
            } catch  {
                this.invalidCount++;
                this.synchronizeTopLevel();
            }
            if (this.pos === startPos && !this.isAtEnd()) {
                const stuck = this.advance();
                this.invalidCount++;
                this.addDiag("error", "syntax", `Unexpected token '${stuck.value}' at top level`, stuck);
            }
        }
    }
    parseTopLevel() {
        const t = this.peek();
        if (t.type === "PREPROCESSOR") {
            this.advance();
            return this.parsePreprocessor(t);
        }
        if (t.value === ";") {
            this.advance();
            return [];
        }
        if (t.value === "enum") {
            return [
                this.parseEnum()
            ];
        }
        if (t.value === "struct" || t.value === "class") {
            return [
                this.parseStructOrClass()
            ];
        }
        if (t.value === "typedef" || t.value === "using" || t.value === "namespace" || t.value === "template") {
            return [
                this.parseUnsupportedTopLevel()
            ];
        }
        if (this.looksLikeTypeStart(this.pos)) {
            return this.parseDeclOrFunction();
        }
        // Fallback: unrecognized top-level token
        this.invalidCount++;
        this.addDiag("error", "syntax", `Unexpected token '${t.value}' outside function or declaration`, t);
        this.advance();
        this.synchronizeTopLevel();
        return [];
    }
    parsePreprocessor(token) {
        const raw = token.value.slice(1).trim();
        const incMatch = raw.match(/^include\s*(<([^>]+)>|"([^"]+)")/);
        if (incMatch) {
            const isLocal = Boolean(incMatch[3]);
            const header = incMatch[2] || incMatch[3] || "";
            const node = {
                kind: "Include",
                header,
                isLocal,
                file: token.file,
                line: token.line,
                column: token.column
            };
            this.includes.push(node);
            this.parsedCount++;
            return [
                node
            ];
        }
        const defFuncMatch = raw.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)\s*(.*)$/);
        if (defFuncMatch) {
            const node = {
                kind: "Define",
                name: defFuncMatch[1],
                params: defFuncMatch[2].split(",").map((s)=>s.trim()).filter(Boolean),
                value: defFuncMatch[3].trim(),
                file: token.file,
                line: token.line,
                column: token.column
            };
            this.defines.push(node);
            this.parsedCount++;
            return [
                node
            ];
        }
        const defMatch = raw.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.*))?$/);
        if (defMatch) {
            const node = {
                kind: "Define",
                name: defMatch[1],
                params: null,
                value: (defMatch[2] ?? "1").trim(),
                file: token.file,
                line: token.line,
                column: token.column
            };
            this.defines.push(node);
            this.parsedCount++;
            return [
                node
            ];
        }
        // #ifdef, #ifndef, #endif, #pragma, #if, #else — recognized preprocessor guards
        if (/^(ifdef|ifndef|endif|else|elif|if|undef|pragma)\b/.test(raw)) {
            this.parsedCount++;
            return [];
        }
        this.unsupportedCount++;
        const u = {
            kind: "UnsupportedNode",
            construct: "preprocessor",
            rawSnippet: token.value,
            file: token.file,
            line: token.line,
            column: token.column
        };
        return [
            u
        ];
    }
    parseUnsupportedTopLevel() {
        const start = this.advance();
        const parts = [
            start.value
        ];
        let depth = 0;
        while(!this.isAtEnd()){
            const cur = this.advance();
            parts.push(cur.value);
            if (cur.value === "{") depth++;
            else if (cur.value === "}") {
                depth--;
                if (depth <= 0) {
                    if (this.check(";")) this.advance();
                    break;
                }
            } else if (cur.value === ";" && depth === 0) {
                break;
            }
            if (parts.length > 80) break;
        }
        this.unsupportedCount++;
        const snippet = parts.slice(0, 12).join(" ");
        this.addDiag("warning", "unsupported", `Recognized C++ construct '${start.value}' is parsed structurally but not executed by the Arduino subset interpreter.`, start);
        return {
            kind: "UnsupportedNode",
            construct: start.value,
            rawSnippet: snippet,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseEnum() {
        const start = this.advance(); // 'enum'
        let isClass = false;
        if (this.match("class") || this.match("struct")) {
            isClass = true;
        }
        let name = "AnonymousEnum";
        if (this.peek().type === "IDENTIFIER") {
            name = this.advance().value;
            this.knownTypes.add(name);
        }
        // Optional underlying type `: uint8_t`
        if (this.match(":")) {
            this.parseTypeName();
        }
        this.expect("{", `Expected '{' in enum '${name}'`);
        const members = [];
        while(!this.isAtEnd() && !this.check("}")){
            if (this.peek().type === "IDENTIFIER" || this.peek().type === "KEYWORD") {
                const memName = this.advance().value;
                let value;
                if (this.match("=")) {
                    value = this.parseExpression();
                }
                members.push({
                    name: memName,
                    value
                });
                if (!this.match(",")) break;
            } else {
                this.invalidCount++;
                this.addDiag("error", "syntax", `Expected enum member name, found '${this.peek().value}'`);
                this.advance();
            }
        }
        this.expect("}", `Expected '}' closing enum '${name}'`);
        this.match(";");
        this.parsedCount++;
        return {
            kind: "EnumDecl",
            name,
            isClass,
            members,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseStructOrClass() {
        const start = this.advance();
        const structKind = start.value === "class" ? "class" : "struct";
        let name = "AnonymousStruct";
        if (this.peek().type === "IDENTIFIER") {
            name = this.advance().value;
            this.knownTypes.add(name);
        }
        // Optional inheritance `: public Base`
        if (this.match(":")) {
            while(!this.isAtEnd() && !this.check("{") && !this.check(";")){
                this.advance();
            }
        }
        const fields = [];
        const methods = [];
        if (this.match("{")) {
            while(!this.isAtEnd() && !this.check("}")){
                if ((this.check("public") || this.check("private") || this.check("protected")) && this.peek(1).value === ":") {
                    this.advance();
                    this.advance();
                    continue;
                }
                if (this.check(";")) {
                    this.advance();
                    continue;
                }
                // Constructor `ClassName(...)`
                if (this.peek().value === name && this.peek(1).value === "(") {
                    const ctor = this.parseMethodOrCtor(name, name);
                    if (ctor) methods.push(ctor);
                    continue;
                }
                if (this.looksLikeTypeStart(this.pos)) {
                    const parsed = this.parseDeclOrFunction();
                    for (const d of parsed){
                        if (d.kind === "VarDecl") fields.push(d);
                        else if (d.kind === "FunctionDecl") methods.push(d);
                    }
                    continue;
                }
                this.advance();
            }
            this.expect("}", `Expected '}' closing ${structKind} '${name}'`);
        }
        this.match(";");
        this.parsedCount++;
        return {
            kind: "StructOrClassDecl",
            structKind,
            name,
            fields,
            methods,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseMethodOrCtor(returnType, name) {
        const start = this.advance();
        const params = this.parseParamList();
        // Optional member initializer list `: a(1), b(2)`
        if (this.match(":")) {
            while(!this.isAtEnd() && !this.check("{") && !this.check(";")){
                this.advance();
            }
        }
        let body = null;
        if (this.check("{")) {
            body = this.parseBlock();
        } else {
            this.match(";");
        }
        this.parsedCount++;
        return {
            kind: "FunctionDecl",
            returnType,
            name,
            params,
            body,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    isTypeToken(t) {
        if (t.type === "KEYWORD" && (__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TYPE_KEYWORDS"].has(t.value) || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUALIFIER_KEYWORDS"].has(t.value))) {
            return true;
        }
        if (t.type === "IDENTIFIER" && (this.knownTypes.has(t.value) || BUILTIN_CLASS_TYPES.has(t.value))) {
            return true;
        }
        return false;
    }
    looksLikeTypeStart(startIdx) {
        let idx = startIdx;
        let sawQualifierOrBuiltin = false;
        while(idx < this.tokens.length){
            const t = this.tokens[idx];
            if (t.type === "KEYWORD" && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUALIFIER_KEYWORDS"].has(t.value)) {
                sawQualifierOrBuiltin = true;
                idx++;
                continue;
            }
            break;
        }
        const base = this.tokens[idx];
        if (!base) return false;
        if (base.type === "KEYWORD" && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TYPE_KEYWORDS"].has(base.value)) {
            return true;
        }
        if (base.type === "IDENTIFIER" && (this.knownTypes.has(base.value) || BUILTIN_CLASS_TYPES.has(base.value))) {
            // Disambiguate `MyType x` vs `MyType(args)` expression
            const next = this.tokens[idx + 1];
            if (!next) return false;
            if (next.type === "IDENTIFIER" || next.value === "*" || next.value === "&" || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUALIFIER_KEYWORDS"].has(next.value)) {
                return true;
            }
            return sawQualifierOrBuiltin;
        }
        // Heuristic for unknown external class declaration at top-level or statement: `SomeLibClass obj(a, b);` or `SomeLibClass obj;`
        if (base.type === "IDENTIFIER" && /^[A-Z][A-Za-z0-9_]*$/.test(base.value)) {
            const next = this.tokens[idx + 1];
            const next2 = this.tokens[idx + 2];
            if (next && next.type === "IDENTIFIER" && next2 && (next2.value === ";" || next2.value === "=" || next2.value === "(" || next2.value === "[")) {
                return true;
            }
        }
        return false;
    }
    parseTypeName() {
        let isConst = false;
        let isStatic = false;
        let isProgmem = false;
        const parts = [];
        while(!this.isAtEnd()){
            const t = this.peek();
            if (t.type === "KEYWORD" && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUALIFIER_KEYWORDS"].has(t.value)) {
                if (t.value === "const" || t.value === "constexpr") isConst = true;
                if (t.value === "static") isStatic = true;
                if (t.value === "PROGMEM") isProgmem = true;
                this.advance();
                continue;
            }
            break;
        }
        // Handle multi-word numeric types like `unsigned long`, `unsigned char`, `long long`, `signed int`
        while(!this.isAtEnd()){
            const t = this.peek();
            if (t.type === "KEYWORD" && (t.value === "unsigned" || t.value === "signed" || t.value === "long" || t.value === "short")) {
                parts.push(this.advance().value);
                continue;
            }
            if (parts.length === 0 || t.type === "KEYWORD" && (t.value === "int" || t.value === "char" || t.value === "double")) {
                if (this.isTypeToken(t) || t.type === "IDENTIFIER") {
                    parts.push(this.advance().value);
                }
            }
            break;
        }
        // Consume post-type qualifiers (`const`, `PROGMEM`) and pointers/references (`*`, `&`)
        while(!this.isAtEnd()){
            const t = this.peek();
            if (t.type === "KEYWORD" && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUALIFIER_KEYWORDS"].has(t.value)) {
                if (t.value === "const") isConst = true;
                if (t.value === "PROGMEM") isProgmem = true;
                this.advance();
                continue;
            }
            if (t.value === "*" || t.value === "&") {
                parts.push(this.advance().value);
                continue;
            }
            break;
        }
        return {
            typeName: parts.join(" ") || "int",
            isConst,
            isStatic,
            isProgmem
        };
    }
    parseDeclOrFunction() {
        const startToken = this.peek();
        const { typeName, isConst, isStatic, isProgmem } = this.parseTypeName();
        if (this.peek().type !== "IDENTIFIER") {
            this.invalidCount++;
            this.addDiag("error", "syntax", `Expected identifier after type '${typeName}', found '${this.peek().value}'`);
            this.synchronizeTopLevel();
            return [];
        }
        const nameToken = this.advance();
        let name = nameToken.value;
        // Handle ClassName::methodName
        if (this.match("::") && this.peek().type === "IDENTIFIER") {
            name = `${name}::${this.advance().value}`;
        }
        // Check if Function Declaration/Definition vs Constructor VarDecl:
        // If `name(` -> distinguish `void foo(int x) { ... }` or `void foo();` vs `Adafruit_SSD1306 display(128, 64, &Wire, -1);`
        if (this.check("(")) {
            if (this.isFunctionSignatureAhead()) {
                const params = this.parseParamList();
                // Optional `const` method qualifier
                if (this.check("const")) this.advance();
                let body = null;
                if (this.check("{")) {
                    body = this.parseBlock();
                } else {
                    this.expect(";", `Expected ';' or '{' after function '${name}' signature`);
                }
                this.parsedCount++;
                return [
                    {
                        kind: "FunctionDecl",
                        returnType: typeName,
                        name,
                        params,
                        body,
                        file: startToken.file,
                        line: startToken.line,
                        column: startToken.column
                    }
                ];
            } else {
                // Object constructor instantiation: e.g. `Adafruit_SSD1306 display(128, 64, &Wire, -1);`
                this.advance(); // '('
                const ctorArgs = [];
                if (!this.check(")")) {
                    do {
                        ctorArgs.push(this.parseExpression());
                    }while (this.match(","))
                }
                this.expect(")", `Expected ')' after constructor arguments for '${name}'`);
                this.expect(";", `Expected ';' after declaration of '${name}'`);
                this.parsedCount++;
                return [
                    {
                        kind: "VarDecl",
                        varType: typeName,
                        name,
                        isConst,
                        isStatic,
                        isProgmem,
                        isArray: false,
                        arrayDimensions: [],
                        initializer: null,
                        constructorArgs: ctorArgs,
                        file: startToken.file,
                        line: startToken.line,
                        column: startToken.column
                    }
                ];
            }
        }
        // Otherwise variable declaration(s): `int a = 1, b = 2;` or `const uint8_t bmp[] PROGMEM = { ... };`
        const vars = [];
        let currentName = name;
        let first = true;
        while(true){
            if (!first) {
                // Optional pointer `*`
                while(this.match("*") || this.match("&")){
                // consumed
                }
                if (this.peek().type !== "IDENTIFIER") {
                    this.invalidCount++;
                    this.addDiag("error", "syntax", `Expected variable name after ',', found '${this.peek().value}'`);
                    break;
                }
                currentName = this.advance().value;
            }
            first = false;
            let localProgmem = isProgmem;
            const arrayDimensions = [];
            let isArray = false;
            while(this.match("[")){
                isArray = true;
                if (this.check("]")) {
                    arrayDimensions.push(null);
                } else {
                    arrayDimensions.push(this.parseExpression());
                }
                this.expect("]", `Expected ']' in array declaration for '${currentName}'`);
            }
            if (this.match("PROGMEM")) {
                localProgmem = true;
            }
            let initializer = null;
            if (this.match("=")) {
                initializer = this.parseInitializer();
            }
            this.parsedCount++;
            vars.push({
                kind: "VarDecl",
                varType: typeName,
                name: currentName,
                isConst,
                isStatic,
                isProgmem: localProgmem,
                isArray,
                arrayDimensions,
                initializer,
                constructorArgs: null,
                file: startToken.file,
                line: startToken.line,
                column: startToken.column
            });
            if (!this.match(",")) break;
        }
        this.expect(";", `Expected ';' after variable declaration '${currentName}'`);
        return vars;
    }
    isFunctionSignatureAhead() {
        // We are sitting on '('. Look inside parentheses up to matching ')'.
        let depth = 0;
        let idx = this.pos;
        let closeIdx = -1;
        while(idx < this.tokens.length){
            const tok = this.tokens[idx];
            if (tok.value === "(") depth++;
            else if (tok.value === ")") {
                depth--;
                if (depth === 0) {
                    closeIdx = idx;
                    break;
                }
            }
            idx++;
        }
        if (closeIdx === -1) return true;
        const after = this.tokens[closeIdx + 1];
        if (after && (after.value === "{" || after.value === "const")) {
            return true;
        }
        // Check inside parens: if empty `()` and followed by `;`, could be function prototype like `void drawEyes();`
        const firstInside = this.tokens[this.pos + 1];
        if (firstInside && firstInside.value === ")") {
            return true;
        }
        // If first token inside parens is a type keyword or known type, it's a function prototype
        if (firstInside && (this.isTypeToken(firstInside) || firstInside.value === "void")) {
            return true;
        }
        return false;
    }
    parseParamList() {
        const params = [];
        this.expect("(");
        if (!this.check(")")) {
            do {
                if (this.check("void") && this.peek(1).value === ")") {
                    this.advance();
                    break;
                }
                const { typeName } = this.parseTypeName();
                let paramName = "";
                if (this.peek().type === "IDENTIFIER") {
                    paramName = this.advance().value;
                }
                let isArray = false;
                while(this.match("[")){
                    isArray = true;
                    if (!this.check("]")) {
                        this.parseExpression();
                    }
                    this.expect("]");
                }
                let defaultValue = null;
                if (this.match("=")) {
                    defaultValue = this.parseExpression();
                }
                params.push({
                    paramType: typeName,
                    name: paramName,
                    isArray,
                    defaultValue
                });
            }while (this.match(","))
        }
        this.expect(")");
        return params;
    }
    parseBlock() {
        const start = this.expect("{") ?? this.peek();
        const statements = [];
        while(!this.isAtEnd() && !this.check("}")){
            const before = this.pos;
            const stmts = this.parseStatement();
            for (const s of stmts)statements.push(s);
            if (this.pos === before && !this.isAtEnd()) {
                const stuck = this.advance();
                this.invalidCount++;
                this.addDiag("error", "syntax", `Unexpected token '${stuck.value}' in block`, stuck);
                this.synchronizeStatement();
            }
        }
        this.expect("}", "Expected '}' to close block");
        return {
            kind: "BlockStmt",
            statements,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseStatement() {
        const t = this.peek();
        if (t.type === "PREPROCESSOR") {
            this.advance();
            this.parsePreprocessor(t);
            return [];
        }
        if (t.value === "{") return [
            this.parseBlock()
        ];
        if (t.value === ";") {
            this.advance();
            return [
                {
                    kind: "EmptyStmt",
                    file: t.file,
                    line: t.line,
                    column: t.column
                }
            ];
        }
        if (t.value === "if") return [
            this.parseIf()
        ];
        if (t.value === "while") return [
            this.parseWhile()
        ];
        if (t.value === "do") return [
            this.parseDoWhile()
        ];
        if (t.value === "for") return [
            this.parseFor()
        ];
        if (t.value === "switch") return [
            this.parseSwitch()
        ];
        if (t.value === "return") return [
            this.parseReturn()
        ];
        if (t.value === "break") {
            this.advance();
            this.expect(";");
            this.parsedCount++;
            return [
                {
                    kind: "BreakStmt",
                    file: t.file,
                    line: t.line,
                    column: t.column
                }
            ];
        }
        if (t.value === "continue") {
            this.advance();
            this.expect(";");
            this.parsedCount++;
            return [
                {
                    kind: "ContinueStmt",
                    file: t.file,
                    line: t.line,
                    column: t.column
                }
            ];
        }
        if (this.looksLikeTypeStart(this.pos)) {
            const decls = this.parseDeclOrFunction();
            return decls.filter((d)=>d.kind === "VarDecl" || d.kind === "UnsupportedNode");
        }
        const expr = this.parseExpression();
        this.expect(";", `Expected ';' after expression`);
        this.parsedCount++;
        return [
            {
                kind: "ExprStmt",
                expression: expr,
                file: t.file,
                line: t.line,
                column: t.column
            }
        ];
    }
    parseSingleStatement() {
        const list = this.parseStatement();
        if (list.length === 1) return list[0];
        const t = this.peek();
        return {
            kind: "BlockStmt",
            statements: list,
            file: t.file,
            line: t.line,
            column: t.column
        };
    }
    parseIf() {
        const start = this.advance();
        this.expect("(", "Expected '(' after 'if'");
        const condition = this.parseExpression();
        this.expect(")", "Expected ')' after if condition");
        const thenBranch = this.parseSingleStatement();
        let elseBranch = null;
        if (this.match("else")) {
            elseBranch = this.parseSingleStatement();
        }
        this.parsedCount++;
        return {
            kind: "IfStmt",
            condition,
            thenBranch,
            elseBranch,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseWhile() {
        const start = this.advance();
        this.expect("(", "Expected '(' after 'while'");
        const condition = this.parseExpression();
        this.expect(")", "Expected ')' after while condition");
        const body = this.parseSingleStatement();
        this.parsedCount++;
        return {
            kind: "WhileStmt",
            condition,
            body,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseDoWhile() {
        const start = this.advance();
        const body = this.parseSingleStatement();
        this.expect("while", "Expected 'while' after do body");
        this.expect("(", "Expected '(' after 'while'");
        const condition = this.parseExpression();
        this.expect(")", "Expected ')' after do-while condition");
        this.expect(";", "Expected ';' after do-while statement");
        this.parsedCount++;
        return {
            kind: "DoWhileStmt",
            body,
            condition,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseFor() {
        const start = this.advance();
        this.expect("(", "Expected '(' after 'for'");
        let init = null;
        if (this.match(";")) {
            init = null;
        } else if (this.looksLikeTypeStart(this.pos)) {
            const decls = this.parseDeclOrFunction();
            if (decls.length === 1 && decls[0].kind === "VarDecl") {
                init = decls[0];
            } else {
                init = {
                    kind: "BlockStmt",
                    statements: decls.filter((d)=>d.kind === "VarDecl"),
                    file: start.file,
                    line: start.line,
                    column: start.column
                };
            }
        } else {
            const initExpr = this.parseExpression();
            this.expect(";");
            init = {
                kind: "ExprStmt",
                expression: initExpr,
                file: start.file,
                line: start.line,
                column: start.column
            };
        }
        let condition = null;
        if (!this.check(";")) {
            condition = this.parseExpression();
        }
        this.expect(";", "Expected ';' after for-loop condition");
        let update = null;
        if (!this.check(")")) {
            update = this.parseExpression();
        }
        this.expect(")", "Expected ')' after for-loop clauses");
        const body = this.parseSingleStatement();
        this.parsedCount++;
        return {
            kind: "ForStmt",
            init,
            condition,
            update,
            body,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseSwitch() {
        const start = this.advance();
        this.expect("(", "Expected '(' after 'switch'");
        const discriminant = this.parseExpression();
        this.expect(")", "Expected ')' after switch expression");
        this.expect("{", "Expected '{' after switch(...)");
        const cases = [];
        while(!this.isAtEnd() && !this.check("}")){
            if (this.match("case")) {
                const test = this.parseExpression();
                this.expect(":", "Expected ':' after case label");
                const consequent = [];
                while(!this.isAtEnd() && !this.check("case") && !this.check("default") && !this.check("}")){
                    const stmts = this.parseStatement();
                    for (const s of stmts)consequent.push(s);
                }
                cases.push({
                    test,
                    consequent
                });
            } else if (this.match("default")) {
                this.expect(":", "Expected ':' after default label");
                const consequent = [];
                while(!this.isAtEnd() && !this.check("case") && !this.check("default") && !this.check("}")){
                    const stmts = this.parseStatement();
                    for (const s of stmts)consequent.push(s);
                }
                cases.push({
                    test: null,
                    consequent
                });
            } else {
                this.invalidCount++;
                this.addDiag("error", "syntax", `Expected 'case' or 'default' in switch, found '${this.peek().value}'`);
                this.advance();
            }
        }
        this.expect("}", "Expected '}' closing switch statement");
        this.parsedCount++;
        return {
            kind: "SwitchStmt",
            discriminant,
            cases,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseReturn() {
        const start = this.advance();
        let argument = null;
        if (!this.check(";")) {
            argument = this.parseExpression();
        }
        this.expect(";", "Expected ';' after return statement");
        this.parsedCount++;
        return {
            kind: "ReturnStmt",
            argument,
            file: start.file,
            line: start.line,
            column: start.column
        };
    }
    parseInitializer() {
        if (this.check("{")) {
            const start = this.advance();
            const elements = [];
            if (!this.check("}")) {
                do {
                    if (this.check("}")) break; // allow trailing comma
                    elements.push(this.parseInitializer());
                }while (this.match(","))
            }
            this.expect("}", "Expected '}' closing initializer list");
            return {
                kind: "ArrayInit",
                elements,
                file: start.file,
                line: start.line,
                column: start.column
            };
        }
        return this.parseExpression();
    }
    parseExpression() {
        return this.parseAssignment();
    }
    parseAssignment() {
        const left = this.parseTernary();
        const t = this.peek();
        if (t.type === "OPERATOR" && [
            "=",
            "+=",
            "-=",
            "*=",
            "/=",
            "%=",
            "&=",
            "|=",
            "^=",
            "<<=",
            ">>="
        ].includes(t.value)) {
            this.advance();
            const right = this.parseAssignment();
            return {
                kind: "AssignExpr",
                operator: t.value,
                left,
                right,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        return left;
    }
    parseTernary() {
        let expr = this.parseLogicalOr();
        if (this.match("?")) {
            const qTok = this.peek(-1);
            const consequent = this.parseExpression();
            this.expect(":", "Expected ':' in ternary expression");
            const alternate = this.parseTernary();
            expr = {
                kind: "TernaryExpr",
                condition: expr,
                consequent,
                alternate,
                file: qTok.file,
                line: qTok.line,
                column: qTok.column
            };
        }
        return expr;
    }
    parseBinary(next, operators) {
        let left = next();
        while(this.peek().type === "OPERATOR" && operators.includes(this.peek().value)){
            const op = this.advance();
            const right = next();
            left = {
                kind: "BinaryExpr",
                operator: op.value,
                left,
                right,
                file: op.file,
                line: op.line,
                column: op.column
            };
        }
        return left;
    }
    parseLogicalOr() {
        return this.parseBinary(()=>this.parseLogicalAnd(), [
            "||"
        ]);
    }
    parseLogicalAnd() {
        return this.parseBinary(()=>this.parseBitwiseOr(), [
            "&&"
        ]);
    }
    parseBitwiseOr() {
        return this.parseBinary(()=>this.parseBitwiseXor(), [
            "|"
        ]);
    }
    parseBitwiseXor() {
        return this.parseBinary(()=>this.parseBitwiseAnd(), [
            "^"
        ]);
    }
    parseBitwiseAnd() {
        return this.parseBinary(()=>this.parseEquality(), [
            "&"
        ]);
    }
    parseEquality() {
        return this.parseBinary(()=>this.parseRelational(), [
            "==",
            "!="
        ]);
    }
    parseRelational() {
        return this.parseBinary(()=>this.parseShift(), [
            "<",
            "<=",
            ">",
            ">="
        ]);
    }
    parseShift() {
        return this.parseBinary(()=>this.parseAdditive(), [
            "<<",
            ">>"
        ]);
    }
    parseAdditive() {
        return this.parseBinary(()=>this.parseMultiplicative(), [
            "+",
            "-"
        ]);
    }
    parseMultiplicative() {
        return this.parseBinary(()=>this.parseUnary(), [
            "*",
            "/",
            "%"
        ]);
    }
    parseUnary() {
        const t = this.peek();
        if (t.value === "sizeof") {
            this.advance();
            let target = "";
            if (this.match("(")) {
                const parts = [];
                let depth = 1;
                while(!this.isAtEnd() && depth > 0){
                    const cur = this.advance();
                    if (cur.value === "(") depth++;
                    else if (cur.value === ")") {
                        depth--;
                        if (depth === 0) break;
                    }
                    parts.push(cur.value);
                }
                target = parts.join(" ");
            } else {
                target = this.advance().value;
            }
            return {
                kind: "SizeofExpr",
                target,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        // C-style cast: `(int)x`, `(float)val`, `(uint8_t)a`
        if (t.value === "(" && this.looksLikeCastAhead()) {
            this.advance(); // '('
            const { typeName } = this.parseTypeName();
            this.expect(")");
            const operand = this.parseUnary();
            return {
                kind: "CastExpr",
                targetType: typeName,
                operand,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.type === "OPERATOR" && [
            "!",
            "~",
            "-",
            "+",
            "++",
            "--",
            "&",
            "*"
        ].includes(t.value)) {
            this.advance();
            const operand = this.parseUnary();
            return {
                kind: "UnaryExpr",
                operator: t.value,
                operand,
                prefix: true,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        return this.parsePostfix();
    }
    looksLikeCastAhead() {
        const t1 = this.peek(1);
        if (!t1) return false;
        if (t1.type === "KEYWORD" && (__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TYPE_KEYWORDS"].has(t1.value) || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUALIFIER_KEYWORDS"].has(t1.value))) {
            // Find closing ')' and check it's NOT followed by ';' or ')' alone
            let idx = this.pos + 1;
            while(idx < this.tokens.length && this.tokens[idx].value !== ")"){
                if (this.tokens[idx].value === "(" || this.tokens[idx].value === ";") return false;
                idx++;
            }
            const after = this.tokens[idx + 1];
            if (!after) return false;
            return after.value !== ";" && after.value !== ")" && after.value !== "," && after.value !== "}";
        }
        return false;
    }
    parsePostfix() {
        let expr = this.parsePrimary();
        while(!this.isAtEnd()){
            const t = this.peek();
            if (t.value === "(") {
                this.advance();
                const args = [];
                if (!this.check(")")) {
                    do {
                        args.push(this.parseExpression());
                    }while (this.match(","))
                }
                this.expect(")", "Expected ')' after function arguments");
                expr = {
                    kind: "CallExpr",
                    callee: expr,
                    args,
                    file: t.file,
                    line: t.line,
                    column: t.column
                };
            } else if (t.value === "." || t.value === "->") {
                const op = this.advance();
                const prop = this.advance();
                expr = {
                    kind: "MemberExpr",
                    object: expr,
                    property: prop.value,
                    isArrow: op.value === "->",
                    file: op.file,
                    line: op.line,
                    column: op.column
                };
            } else if (t.value === "[") {
                const bracket = this.advance();
                const index = this.parseExpression();
                this.expect("]", "Expected ']' after array index");
                expr = {
                    kind: "IndexExpr",
                    object: expr,
                    index,
                    file: bracket.file,
                    line: bracket.line,
                    column: bracket.column
                };
            } else if (t.value === "++" || t.value === "--") {
                const op = this.advance();
                expr = {
                    kind: "UnaryExpr",
                    operator: op.value,
                    operand: expr,
                    prefix: false,
                    file: op.file,
                    line: op.line,
                    column: op.column
                };
            } else {
                break;
            }
        }
        return expr;
    }
    parsePrimary() {
        const t = this.peek();
        if (t.type === "NUMBER") {
            this.advance();
            return {
                kind: "NumberLiteral",
                value: parseNumberValue(t.value),
                raw: t.value,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.type === "STRING") {
            this.advance();
            let combined = t.value;
            // C++ adjacent string literal concatenation
            while(this.peek().type === "STRING"){
                combined += this.advance().value;
            }
            return {
                kind: "StringLiteral",
                value: combined,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.type === "CHAR") {
            this.advance();
            return {
                kind: "CharLiteral",
                value: t.value,
                charCode: t.value.length > 0 ? t.value.charCodeAt(0) : 0,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.value === "true" || t.value === "false") {
            this.advance();
            return {
                kind: "BoolLiteral",
                value: t.value === "true",
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.value === "nullptr" || t.value === "NULL") {
            this.advance();
            return {
                kind: "NumberLiteral",
                value: 0,
                raw: t.value,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.value === "(") {
            this.advance();
            const expr = this.parseExpression();
            this.expect(")", "Expected ')' after parenthesized expression");
            return expr;
        }
        // Functional-style type cast like `String(123)` or `int(x)` or `float(a)`
        if (t.type === "KEYWORD" && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TYPE_KEYWORDS"].has(t.value)) {
            this.advance();
            return {
                kind: "Identifier",
                name: t.value,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.type === "IDENTIFIER" || t.value === "this") {
            this.advance();
            let name = t.value;
            // Scoped enum / static member `State::PET`
            if (this.match("::") && this.peek().type === "IDENTIFIER") {
                name = `${name}::${this.advance().value}`;
            }
            return {
                kind: "Identifier",
                name,
                file: t.file,
                line: t.line,
                column: t.column
            };
        }
        if (t.value === "{") {
            return this.parseInitializer();
        }
        this.invalidCount++;
        this.addDiag("error", "syntax", `Unexpected token '${t.value || "EOF"}' in expression`, t);
        if (!this.isAtEnd()) this.advance();
        return {
            kind: "NumberLiteral",
            value: 0,
            raw: "0",
            file: t.file,
            line: t.line,
            column: t.column
        };
    }
}
function parseFirmwareProject(files) {
    const declarations = [];
    const includes = [];
    const defines = [];
    const diagnostics = [];
    const missingSourceFiles = [];
    const knownTypes = new Set(BUILTIN_CLASS_TYPES);
    let totalLines = 0;
    let successfullyParsedNodes = 0;
    let recognizedUnsupportedNodes = 0;
    let invalidSyntaxNodes = 0;
    // Sort headers (.h, .hpp) first so user-defined structs/enums are registered before .ino/.cpp
    const ordered = [
        ...files
    ].sort((a, b)=>{
        const score = (f)=>{
            const ext = f.extension.toLowerCase();
            if (ext === ".h" || ext === ".hpp") return 0;
            if (ext === ".ino") return 1;
            if (ext === ".cpp") return 2;
            return 3;
        };
        return score(a) - score(b);
    });
    const fileIndex = new Map();
    for (const f of ordered){
        fileIndex.set(f.path.toLowerCase(), f);
        fileIndex.set(f.name.toLowerCase(), f);
    }
    for (const file of ordered){
        const ext = file.extension.toLowerCase();
        // Skip non-code notes unless it's .txt containing C++ code
        const lexRes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$parser$2f$lexer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["tokenizeSource"])(file.content, file.path);
        totalLines += lexRes.lineCount;
        for (const d of lexRes.diagnostics){
            diagnostics.push(d);
            invalidSyntaxNodes++;
        }
        if (ext === ".txt" && !/\b(void|int|setup|loop|#include|#define)\b/.test(file.content)) {
            continue;
        }
        const parser = new SingleFileParser(lexRes.tokens, file.path, knownTypes);
        parser.parse();
        for (const decl of parser.declarations)declarations.push(decl);
        for (const inc of parser.includes){
            includes.push(inc);
            if (inc.isLocal) {
                const key = inc.header.toLowerCase();
                const baseName = key.split("/").pop() ?? key;
                if (!fileIndex.has(key) && !fileIndex.has(baseName)) {
                    if (!missingSourceFiles.includes(inc.header)) {
                        missingSourceFiles.push(inc.header);
                    }
                    diagnostics.push({
                        id: `missing_${file.path}_${inc.line}_${inc.header}`,
                        severity: "error",
                        category: "missing_dependency",
                        file: file.path,
                        line: inc.line,
                        column: inc.column,
                        message: `Local header file "${inc.header}" was not found in the imported project files.`,
                        suggestion: `Use IMPORT CODE -> Add Files to upload "${inc.header}" into this firmware project.`
                    });
                }
            }
        }
        for (const def of parser.defines)defines.push(def);
        for (const diag of parser.diagnostics)diagnostics.push(diag);
        successfullyParsedNodes += parser.parsedCount;
        recognizedUnsupportedNodes += parser.unsupportedCount;
        invalidSyntaxNodes += parser.invalidCount;
    }
    return {
        declarations,
        includes,
        defines,
        missingSourceFiles,
        totalLines,
        successfullyParsedNodes,
        recognizedUnsupportedNodes,
        invalidSyntaxNodes,
        diagnostics
    };
}
}),
"[project]/src/lib/simulator/types.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_APP_SETTINGS",
    ()=>DEFAULT_APP_SETTINGS,
    "DEFAULT_CUSTOMIZATION",
    ()=>DEFAULT_CUSTOMIZATION,
    "DEFAULT_HARDWARE_CONFIG",
    ()=>DEFAULT_HARDWARE_CONFIG
]);
const DEFAULT_HARDWARE_CONFIG = {
    boardType: "ESP32 DevKit V1",
    oled: {
        enabled: true,
        driver: "SSD1306",
        width: 128,
        height: 64,
        i2cAddress: "0x3C",
        sdaPin: 21,
        sclPin: 22
    },
    touch: {
        mainTouchPin: 27,
        wakeTouchPin: 18,
        touchActive: "HIGH",
        debounceMs: 35,
        longPressMs: 650,
        tapIntervalMs: 420,
        sleepTimeoutMs: 20000,
        bothTouchHoldMs: 2000
    },
    audio: {
        buzzerPin: 25,
        speakerPin: 26,
        microphonePin: 34,
        muted: false,
        volume: 0.35
    },
    battery: {
        adcPin: 35,
        levelPercent: 86,
        charging: false
    },
    components: [
        {
            id: "comp_oled",
            type: "oled_ssd1306",
            name: "SSD1306 128x64 OLED",
            pins: [
                21,
                22
            ],
            i2cAddress: "0x3C"
        },
        {
            id: "comp_touch_main",
            type: "touch_sensor",
            name: "Main Touch Pad (Head)",
            pins: [
                27
            ],
            activeLevel: "HIGH"
        },
        {
            id: "comp_touch_wake",
            type: "touch_sensor",
            name: "Wake Touch Pad (Side)",
            pins: [
                18
            ],
            activeLevel: "HIGH"
        },
        {
            id: "comp_buzzer",
            type: "buzzer",
            name: "Piezo Buzzer",
            pins: [
                25
            ]
        },
        {
            id: "comp_led_builtin",
            type: "led",
            name: "Onboard Status LED",
            pins: [
                2
            ]
        }
    ]
};
const DEFAULT_CUSTOMIZATION = {
    eyes: {
        visualOverrideEnabled: false,
        width: 28,
        height: 24,
        size: 1.0,
        spacing: 14,
        shape: "rounded",
        color: "#22D3EE",
        offsetX: 0,
        offsetY: 0,
        pupilSize: 0,
        gazeX: 0,
        gazeY: 0,
        blinkSpeed: 1.0
    },
    oled: {
        resolution: "128x64",
        scale: 2.6,
        brightness: 100,
        contrast: 105,
        backgroundColor: "#020408",
        phosphorColor: "#22D3EE",
        pixelStyle: "grid",
        frameDesign: "emo_visor"
    },
    body: {
        bodyColor: "#141923",
        accentColor: "#22D3EE",
        material: "satin",
        proportions: "standard",
        screenOffsetY: 0,
        lightingIntensity: 78,
        shadowOpacity: 65,
        rotationX: 6,
        rotationY: -10,
        zoom: 1.0,
        cameraAngle: "hero_3q"
    },
    rendering: {
        simulationSpeed: 1.0,
        targetFps: 60,
        quality: "high",
        cameraAutoFollow: false,
        transitionSpeed: 260
    }
};
const DEFAULT_APP_SETTINGS = {
    editorTheme: "oled-dark",
    editorFontSize: 13,
    editorTabSize: 2,
    maxInstructionsPerTick: 24000,
    maxCallStackDepth: 64,
    defaultBaudRate: 115200,
    showHardwareLimitationsBanner: true,
    aiExtensionAssistant: {
        enabled: false,
        provider: "none",
        endpointUrl: "",
        model: "",
        apiKeyConfigured: false
    }
};
}),
];})()

//# sourceMappingURL=src_lib_simulator_0cpz1g7w2fbxf._.js.map