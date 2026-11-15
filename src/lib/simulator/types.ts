export type CapabilityStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED"
  | "NOT_DETECTED"
  | "IMPLEMENTING"
  | "TESTING"
  | "FAILED"
  | "READY"
  | "ACTIVE"
  | "INACTIVE";

export type SupportLevel =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED";

export type SimulationState =
  | "IDLE"
  | "ANALYZED"
  | "BUILT"
  | "RUNNING"
  | "PAUSED"
  | "STOPPED"
  | "ERROR";

export type NavSection =
  | "robot_studio"
  | "code_studio"
  | "import_manager"
  | "capability_center"
  | "hardware_lab"
  | "serial_monitor"
  | "diagnostics"
  | "customization"
  | "project_manager"
  | "settings";

export interface FirmwareFileData {
  id: string;
  path: string;
  name: string;
  extension: string;
  content: string;
  sizeBytes: number;
}

export interface AttachedComponent {
  id: string;
  type:
    | "oled_ssd1306"
    | "touch_sensor"
    | "button"
    | "led"
    | "buzzer"
    | "speaker"
    | "microphone"
    | "potentiometer"
    | "servo"
    | "imu_mpu6050"
    | "battery_monitor";
  name: string;
  pins: number[];
  i2cAddress?: string;
  activeLevel?: "HIGH" | "LOW";
  config?: Record<string, string | number | boolean>;
}

export interface HardwareConfig {
  boardType: "ESP32 DevKit V1" | "ESP32-S3 DevKit" | "ESP32-C3 Mini" | "Arduino Uno (Compat)";
  oled: {
    enabled: boolean;
    driver: "SSD1306";
    width: number;
    height: number;
    i2cAddress: string;
    sdaPin: number;
    sclPin: number;
  };
  touch: {
    mainTouchPin: number;
    wakeTouchPin: number;
    touchActive: "HIGH" | "LOW";
    debounceMs: number;
    longPressMs: number;
    tapIntervalMs: number;
    sleepTimeoutMs: number;
    bothTouchHoldMs: number;
  };
  audio: {
    buzzerPin: number;
    speakerPin: number;
    microphonePin: number;
    muted: boolean;
    volume: number;
  };
  battery: {
    adcPin: number;
    levelPercent: number;
    charging: boolean;
  };
  components: AttachedComponent[];
}

export interface CustomizationConfig {
  eyes: {
    visualOverrideEnabled: boolean;
    width: number;
    height: number;
    size: number;
    spacing: number;
    shape: "rounded" | "sharp" | "oval" | "pixel";
    color: string;
    offsetX: number;
    offsetY: number;
    pupilSize: number;
    gazeX: number;
    gazeY: number;
    blinkSpeed: number;
  };
  oled: {
    resolution: "128x64";
    scale: number;
    brightness: number;
    contrast: number;
    backgroundColor: string;
    phosphorColor: string;
    pixelStyle: "crisp" | "grid" | "glow" | "dual_zone";
    frameDesign: "emo_visor" | "bezel_minimal" | "lab_bench";
  };
  body: {
    bodyColor: string;
    accentColor: string;
    material: "matte" | "satin" | "metallic" | "carbon";
    proportions: "standard" | "compact" | "tall";
    screenOffsetY: number;
    lightingIntensity: number;
    shadowOpacity: number;
    rotationX: number;
    rotationY: number;
    zoom: number;
    cameraAngle: "front" | "hero_3q" | "top_down" | "desk_low";
  };
  rendering: {
    simulationSpeed: number;
    targetFps: number;
    quality: "high" | "balanced" | "battery";
    cameraAutoFollow: boolean;
    transitionSpeed: number;
  };
}

export interface DiagnosticMessage {
  id: string;
  severity: "error" | "warning" | "info";
  category:
    | "syntax"
    | "semantic"
    | "unsupported"
    | "missing_dependency"
    | "runtime"
    | "hardware";
  file: string;
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

export interface AnalyzedFunction {
  name: string;
  returnType: string;
  params: string[];
  file: string;
  line: number;
  hasBody: boolean;
}

export interface AnalyzedVariable {
  name: string;
  type: string;
  isConst: boolean;
  isArray: boolean;
  arrayLength?: number;
  file: string;
  line: number;
  estimatedBytes: number;
}

export interface AnalyzedEnum {
  name: string;
  values: string[];
  file: string;
  line: number;
}

export interface AnalyzedStructOrClass {
  kind: "struct" | "class";
  name: string;
  fields: string[];
  methods: string[];
  file: string;
  line: number;
}

export interface GpioPinUsage {
  pin: string;
  resolvedPin: number | null;
  operations: string[];
  file: string;
  line: number;
}

export interface CodeClassification {
  totalLines: number;
  successfullyParsedNodes: number;
  recognizedUnsupportedNodes: number;
  unrecognizedNodes: number;
  invalidSyntaxNodes: number;
  missingSourceFiles: string[];
}

export interface FirmwareAnalysisReport {
  analyzedAt: string;
  fileCount: number;
  hasSetup: boolean;
  hasLoop: boolean;
  libraries: { name: string; isLocal: boolean; resolved: boolean; file: string; line: number }[];
  macros: { name: string; value: string; file: string; line: number }[];
  functions: AnalyzedFunction[];
  variables: AnalyzedVariable[];
  enums: AnalyzedEnum[];
  classesAndStructs: AnalyzedStructOrClass[];
  gpioUsage: GpioPinUsage[];
  hardwareDependencies: string[];
  estimatedRamBytes: number;
  estimatedSourceBytes: number;
  memoryEstimationNote: string;
  classification: CodeClassification;
  diagnostics: DiagnosticMessage[];
  canExecute: boolean;
  summary: string;
}

export interface DetectionEvidence {
  file: string;
  line: number;
  symbol: string;
  context: string;
}

export interface CapabilityReportEntry {
  moduleId: string;
  featureName: string;
  category: string;
  detected: boolean;
  detectionEvidence: DetectionEvidence[];
  simulatorSupport: SupportLevel;
  implementationStatus: CapabilityStatus;
  runtimeStatus: "ACTIVE" | "INACTIVE" | "READY";
  requiredHardware: string[];
  missingFunctionality: string[];
  explanation: string;
  possibleSolution: string;
  browserSimulatable: "FULL" | "PARTIAL" | "IMPOSSIBLE";
  limitations: string[];
  canImplementSupport: boolean;
  isExtended: boolean;
}

export interface ModuleTestCaseResult {
  name: string;
  passed: boolean;
  durationMs: number;
  detail: string;
}

export interface ModuleTestSuiteResult {
  moduleId: string;
  ranAt: string;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  allPassed: boolean;
  tests: ModuleTestCaseResult[];
}

export interface ModuleExtensionHistoryItem {
  id: string;
  timestamp: string;
  action: "extend" | "rollback" | "test";
  previousEnabled: boolean;
  previousSupportLevel: SupportLevel;
  newEnabled: boolean;
  newSupportLevel: SupportLevel;
  summary: string;
  testResult?: ModuleTestSuiteResult;
  steps: { step: string; status: "ok" | "warn" | "fail"; detail: string }[];
}

export interface PersistedModuleState {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  supportLevel: SupportLevel;
  isExtended: boolean;
  customConfig: Record<string, unknown>;
  extensionHistory: ModuleExtensionHistoryItem[];
  lastTestResult: ModuleTestSuiteResult | null;
}

export interface FirmwareSnapshotRecord {
  id: string;
  projectId: string;
  versionNumber: number;
  label: string;
  sourceOrigin: string;
  notes: string;
  isReadOnly: boolean;
  analysisReport: FirmwareAnalysisReport | null;
  capabilityReport: CapabilityReportEntry[] | null;
  files: FirmwareFileData[];
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  boardType: string;
  activeSnapshotId: string | null;
  hardwareConfig: HardwareConfig;
  customization: CustomizationConfig;
  createdAt: string;
  updatedAt: string;
  snapshotCount?: number;
}

export interface AppSettingsData {
  editorTheme: "oled-dark" | "one-dark" | "high-contrast";
  editorFontSize: number;
  editorTabSize: number;
  maxInstructionsPerTick: number;
  maxCallStackDepth: number;
  defaultBaudRate: number;
  showHardwareLimitationsBanner: boolean;
  aiExtensionAssistant: {
    enabled: boolean;
    provider: "none" | "openai-compatible";
    endpointUrl: string;
    model: string;
    apiKeyConfigured: boolean;
  };
}

export interface SerialLogEntry {
  id: string;
  timestampMs: number;
  wallTime: string;
  direction: "rx" | "tx" | "system" | "error" | "warn";
  text: string;
}

export interface TouchEventRecord {
  id: string;
  timestampMs: number;
  sensor: "MAIN_TOUCH" | "WAKE_TOUCH" | "BOTH" | "BUTTON";
  pin: number;
  eventType: "PRESS" | "RELEASE" | "SHORT_PRESS" | "LONG_PRESS" | "DOUBLE_TAP" | "BOTH_HOLD";
  value: number;
}

export interface RuntimeEventRecord {
  id: string;
  timestampMs: number;
  category: "lifecycle" | "gpio" | "oled" | "touch" | "audio" | "storage" | "bus" | "warning" | "error";
  message: string;
  file?: string;
  line?: number;
}

export interface VirtualPinState {
  pin: number;
  mode: "INPUT" | "OUTPUT" | "INPUT_PULLUP" | "INPUT_PULLDOWN" | "UNCONFIGURED";
  digitalValue: 0 | 1;
  analogValue: number; // 0..4095 for ESP32 12-bit ADC
  pwmValue: number; // 0..255
  touchValue: number; // 0..100 capacitive reading (lower = touched)
  label?: string;
}

export interface RuntimeSnapshot {
  state: SimulationState;
  simTimeMs: number;
  loopIterations: number;
  instructionsExecuted: number;
  activeModules: string[];
  pins: Record<number, VirtualPinState>;
  variables: Record<string, { type: string; value: string }>;
  oledFrameCount: number;
  oledActivePixels: number;
  oledInverted: boolean;
  oledDimmed: boolean;
  oledInitialized: boolean;
  audioState: {
    buzzerActive: boolean;
    buzzerFreqHz: number;
    speakerActive: boolean;
    speakerFreqHz: number;
    micLevel: number;
  };
  nvsStorage: Record<string, Record<string, string | number | boolean>>;
  servos: Record<number, number>;
  imu: { ax: number; ay: number; az: number; gx: number; gy: number; gz: number };
  wifiMock: { connected: boolean; ssid: string; ip: string; rssi: number };
  lastError: DiagnosticMessage | null;
}

export const DEFAULT_HARDWARE_CONFIG: HardwareConfig = {
  boardType: "ESP32 DevKit V1",
  oled: {
    enabled: true,
    driver: "SSD1306",
    width: 128,
    height: 64,
    i2cAddress: "0x3C",
    sdaPin: 21,
    sclPin: 22,
  },
  touch: {
    mainTouchPin: 27,
    wakeTouchPin: 18,
    touchActive: "HIGH",
    debounceMs: 35,
    longPressMs: 650,
    tapIntervalMs: 420,
    sleepTimeoutMs: 20000,
    bothTouchHoldMs: 2000,
  },
  audio: {
    buzzerPin: 25,
    speakerPin: 26,
    microphonePin: 34,
    muted: false,
    volume: 0.35,
  },
  battery: {
    adcPin: 35,
    levelPercent: 86,
    charging: false,
  },
  components: [
    {
      id: "comp_oled",
      type: "oled_ssd1306",
      name: "SSD1306 128x64 OLED",
      pins: [21, 22],
      i2cAddress: "0x3C",
    },
    {
      id: "comp_touch_main",
      type: "touch_sensor",
      name: "Main Touch Pad (Head)",
      pins: [27],
      activeLevel: "HIGH",
    },
    {
      id: "comp_touch_wake",
      type: "touch_sensor",
      name: "Wake Touch Pad (Side)",
      pins: [18],
      activeLevel: "HIGH",
    },
    {
      id: "comp_buzzer",
      type: "buzzer",
      name: "Piezo Buzzer",
      pins: [25],
    },
    {
      id: "comp_led_builtin",
      type: "led",
      name: "Onboard Status LED",
      pins: [2],
    },
  ],
};

export const DEFAULT_CUSTOMIZATION: CustomizationConfig = {
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
    blinkSpeed: 1.0,
  },
  oled: {
    resolution: "128x64",
    scale: 2.6,
    brightness: 100,
    contrast: 105,
    backgroundColor: "#020408",
    phosphorColor: "#22D3EE",
    pixelStyle: "grid",
    frameDesign: "emo_visor",
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
    cameraAngle: "hero_3q",
  },
  rendering: {
    simulationSpeed: 1.0,
    targetFps: 60,
    quality: "high",
    cameraAutoFollow: false,
    transitionSpeed: 260,
  },
};

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
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
    apiKeyConfigured: false,
  },
};
