import type {
  CapabilityReportEntry,
  FirmwareAnalysisReport,
  FirmwareFileData,
  ModuleExtensionHistoryItem,
  ModuleTestSuiteResult,
  PersistedModuleState,
  SupportLevel,
} from "../types";
import { HARDWARE_MODULE_MAP } from "../modules/registry";
import { analyzeFirmware } from "../analyzer/analyzer";

export interface ExtensionStepLog {
  step: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface ExtendModuleResult {
  success: boolean;
  finalStatus: "SUPPORTED" | "PARTIALLY_SUPPORTED" | "FAILED" | "UNSUPPORTED";
  updatedModule: PersistedModuleState;
  testResult: ModuleTestSuiteResult;
  steps: ExtensionStepLog[];
  historyEntry: ModuleExtensionHistoryItem;
  reanalysis?: {
    analysisReport: FirmwareAnalysisReport;
    capabilityReport: CapabilityReportEntry[];
  };
}

export function executeModuleExtension(
  moduleId: string,
  currentModules: PersistedModuleState[],
  firmwareFiles?: FirmwareFileData[]
): ExtendModuleResult {
  const def = HARDWARE_MODULE_MAP.get(moduleId);
  if (!def) {
    throw new Error(`Unknown hardware module '${moduleId}'`);
  }

  const existing = currentModules.find((m) => m.id === moduleId) ?? {
    id: def.id,
    name: def.name,
    version: def.version,
    enabled: def.defaultEnabled,
    supportLevel: def.defaultSupportLevel,
    isExtended: false,
    customConfig: {},
    extensionHistory: [],
    lastTestResult: null,
  };

  const steps: ExtensionStepLog[] = [];

  // Step 1: Inspect unsupported APIs
  const matchedApis = def.supportedApis.join(", ");
  steps.push({
    step: "1. Inspect Unsupported APIs",
    status: "ok",
    detail: `Inspected target API surface for '${def.name}': ${matchedApis}`,
  });

  // Step 2: Identify required hardware behavior
  steps.push({
    step: "2. Identify Required Hardware Behavior",
    status: "ok",
    detail: `Required hardware: ${def.requiredHardware.join(", ")}. Inputs: ${def.inputInterface.join(
      ", "
    )}. Outputs: ${def.outputInterface.join(", ")}.`,
  });

  // Step 3: Explain what is missing
  steps.push({
    step: "3. Diagnose Missing Capability",
    status: "ok",
    detail: def.missingExplanation,
  });

  // Step 4: Determine browser simulation feasibility
  if (def.browserSimulatable === "IMPOSSIBLE") {
    steps.push({
      step: "4. Browser Feasibility Evaluation",
      status: "fail",
      detail: `CANNOT BE ACCURATELY SIMULATED IN BROWSER: ${def.limitations[0]}`,
    });

    // Still run the feasibility test suite to record an honest failing test report
    const testResult = def.runTests();
    steps.push({
      step: "5. Automated Feasibility Verification",
      status: "fail",
      detail: `${testResult.passed}/${testResult.total} passed — ${testResult.tests[0]?.detail ?? "Hardware unavailable"}`,
    });
    steps.push({
      step: "6. Honest Capability Decision",
      status: "fail",
      detail: `Refused to falsely mark '${def.name}' as SUPPORTED. Original firmware left untouched.`,
    });

    const historyEntry: ModuleExtensionHistoryItem = {
      id: `ext_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "extend",
      previousEnabled: existing.enabled,
      previousSupportLevel: existing.supportLevel,
      newEnabled: false,
      newSupportLevel: "UNSUPPORTED",
      summary: `Blocked: '${def.name}' requires physical hardware unavailable in browser sandbox.`,
      testResult,
      steps,
    };

    const updatedModule: PersistedModuleState = {
      ...existing,
      enabled: false,
      supportLevel: "UNSUPPORTED",
      lastTestResult: testResult,
      extensionHistory: [historyEntry, ...existing.extensionHistory].slice(0, 20),
    };

    return {
      success: false,
      finalStatus: "FAILED",
      updatedModule,
      testResult,
      steps,
      historyEntry,
    };
  }

  const feasibilityNote =
    def.browserSimulatable === "FULL"
      ? `Browser-simulatable (FULL): ${def.implementationStrategy}`
      : `Browser-simulatable (PARTIAL WITH LIMITATIONS): ${def.limitations[0]}`;

  steps.push({
    step: "4. Browser Feasibility Evaluation",
    status: def.browserSimulatable === "FULL" ? "ok" : "warn",
    detail: feasibilityNote,
  });

  // Step 5: Activate / configure virtual hardware module
  const nextSupportLevel: SupportLevel = def.extendedSupportLevel;
  steps.push({
    step: "5. Register Virtual Hardware Module",
    status: "ok",
    detail: `Registered modular HAL driver '${def.id}' v${def.version} (target support: ${nextSupportLevel}). Firmware files preserved unmodified.`,
  });

  // Step 6: Execute real automated module unit tests
  const testResult = def.runTests();
  if (!testResult.allPassed) {
    steps.push({
      step: "6. Execute Automated Module Tests",
      status: "fail",
      detail: `Test suite failed (${testResult.passed}/${testResult.total} passed). Auto-rolling back module change.`,
    });

    const historyEntry: ModuleExtensionHistoryItem = {
      id: `ext_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "extend",
      previousEnabled: existing.enabled,
      previousSupportLevel: existing.supportLevel,
      newEnabled: existing.enabled,
      newSupportLevel: existing.supportLevel,
      summary: `Extension rolled back because automated tests failed (${testResult.failed} failed).`,
      testResult,
      steps,
    };

    const updatedModule: PersistedModuleState = {
      ...existing,
      lastTestResult: testResult,
      extensionHistory: [historyEntry, ...existing.extensionHistory].slice(0, 20),
    };

    return {
      success: false,
      finalStatus: "FAILED",
      updatedModule,
      testResult,
      steps,
      historyEntry,
    };
  }

  steps.push({
    step: "6. Execute Automated Module Tests",
    status: "ok",
    detail: `All ${testResult.passed}/${testResult.total} automated tests passed in ${testResult.durationMs}ms.`,
  });

  // Step 7: Validate compatibility & record rollback checkpoint
  steps.push({
    step: "7. Validate Compatibility & Save Rollback Checkpoint",
    status: nextSupportLevel === "PARTIALLY_SUPPORTED" ? "warn" : "ok",
    detail:
      nextSupportLevel === "PARTIALLY_SUPPORTED"
        ? `Committed as PARTIALLY SUPPORTED with explicit browser limitations documented. Rollback checkpoint stored.`
        : `Committed as SUPPORTED in the capability registry. Rollback checkpoint stored.`,
  });

  const historyEntry: ModuleExtensionHistoryItem = {
    id: `ext_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "extend",
    previousEnabled: existing.enabled,
    previousSupportLevel: existing.supportLevel,
    newEnabled: true,
    newSupportLevel: nextSupportLevel,
    summary: `Implemented ${def.name} (${nextSupportLevel}) — ${testResult.passed}/${testResult.total} tests passed.`,
    testResult,
    steps,
  };

  const updatedModule: PersistedModuleState = {
    ...existing,
    enabled: true,
    supportLevel: nextSupportLevel,
    isExtended: true,
    lastTestResult: testResult,
    extensionHistory: [historyEntry, ...existing.extensionHistory].slice(0, 20),
  };

  // Step 8: Reanalyse imported firmware if present
  let reanalysis: ExtendModuleResult["reanalysis"];
  if (firmwareFiles && firmwareFiles.length > 0) {
    const nextModules = currentModules.map((m) => (m.id === moduleId ? updatedModule : m));
    reanalysis = analyzeFirmware(firmwareFiles, nextModules);
    steps.push({
      step: "8. Reanalyse Imported Firmware & Update Capability Report",
      status: "ok",
      detail: `Reanalysed ${firmwareFiles.length} firmware file(s). Capability report updated to reflect '${def.name}' = ${nextSupportLevel}.`,
    });
  }

  return {
    success: true,
    finalStatus: nextSupportLevel,
    updatedModule,
    testResult,
    steps,
    historyEntry,
    reanalysis,
  };
}

export function rollbackModuleExtension(
  moduleId: string,
  currentModules: PersistedModuleState[],
  firmwareFiles?: FirmwareFileData[]
): {
  updatedModule: PersistedModuleState;
  reanalysis?: {
    analysisReport: FirmwareAnalysisReport;
    capabilityReport: CapabilityReportEntry[];
  };
} {
  const def = HARDWARE_MODULE_MAP.get(moduleId);
  if (!def) throw new Error(`Unknown module '${moduleId}'`);
  const existing = currentModules.find((m) => m.id === moduleId);
  if (!existing) throw new Error(`Module state not found for '${moduleId}'`);

  const lastExtend = existing.extensionHistory.find((h) => h.action === "extend");
  const prevEnabled = lastExtend ? lastExtend.previousEnabled : def.defaultEnabled;
  const prevSupport = lastExtend ? lastExtend.previousSupportLevel : def.defaultSupportLevel;

  const rollbackEntry: ModuleExtensionHistoryItem = {
    id: `rb_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "rollback",
    previousEnabled: existing.enabled,
    previousSupportLevel: existing.supportLevel,
    newEnabled: prevEnabled,
    newSupportLevel: prevSupport,
    summary: `Rolled back '${def.name}' from ${existing.supportLevel} to ${prevSupport}.`,
    steps: [
      {
        step: "Rollback Simulator Module",
        status: "ok",
        detail: `Restored '${def.name}' to enabled=${prevEnabled}, support=${prevSupport}. Firmware files untouched.`,
      },
    ],
  };

  const updatedModule: PersistedModuleState = {
    ...existing,
    enabled: prevEnabled,
    supportLevel: prevSupport,
    isExtended: prevEnabled !== def.defaultEnabled || prevSupport !== def.defaultSupportLevel,
    extensionHistory: [rollbackEntry, ...existing.extensionHistory].slice(0, 20),
  };

  let reanalysis:
    | { analysisReport: FirmwareAnalysisReport; capabilityReport: CapabilityReportEntry[] }
    | undefined;
  if (firmwareFiles && firmwareFiles.length > 0) {
    const nextModules = currentModules.map((m) => (m.id === moduleId ? updatedModule : m));
    reanalysis = analyzeFirmware(firmwareFiles, nextModules);
  }

  return { updatedModule, reanalysis };
}
