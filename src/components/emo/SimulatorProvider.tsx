"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_HARDWARE_CONFIG,
  type AppSettingsData,
  type CapabilityReportEntry,
  type CustomizationConfig,
  type FirmwareAnalysisReport,
  type FirmwareFileData,
  type FirmwareSnapshotRecord,
  type HardwareConfig,
  type ModuleTestSuiteResult,
  type NavSection,
  type PersistedModuleState,
  type ProjectRecord,
  type RuntimeEventRecord,
  type RuntimeSnapshot,
  type SerialLogEntry,
  type TouchEventRecord,
} from "@/lib/simulator/types";
import { EmoFirmwareRuntime } from "@/lib/simulator/interpreter/runtime";
import { analyzeFirmware } from "@/lib/simulator/analyzer/analyzer";
import type { ExtensionStepLog } from "@/lib/simulator/extension/engine";

export interface ExtensionRunReport {
  moduleId: string;
  success: boolean;
  finalStatus: string;
  steps: ExtensionStepLog[];
  testResult: ModuleTestSuiteResult;
}

interface SimulatorContextValue {
  // Navigation & Modals
  activeSection: NavSection;
  setActiveSection: (s: NavSection) => void;
  importModalOpen: boolean;
  setImportModalOpen: (v: boolean) => void;
  jumpTarget: { file: string; line: number; seq: number } | null;
  jumpToCode: (file: string, line?: number) => void;

  // Loading & toast
  loading: boolean;
  busyAction: string | null;
  toast: { type: "info" | "success" | "warn" | "error"; message: string } | null;
  showToast: (type: "info" | "success" | "warn" | "error", message: string) => void;

  // Persisted Workspace Data
  projects: ProjectRecord[];
  activeProject: ProjectRecord | null;
  snapshots: FirmwareSnapshotRecord[];
  activeSnapshot: FirmwareSnapshotRecord | null;
  modules: PersistedModuleState[];
  settings: AppSettingsData;

  // Working code editor files (separated from immutable snapshot!)
  workingFiles: FirmwareFileData[];
  setWorkingFiles: React.Dispatch<React.SetStateAction<FirmwareFileData[]>>;
  hasUnsavedChanges: boolean;
  activeFilePath: string | null;
  setActiveFilePath: (p: string | null) => void;

  // Live Analysis & Capabilities (reflects current snapshot or live working analysis)
  currentAnalysis: FirmwareAnalysisReport | null;
  currentCapabilities: CapabilityReportEntry[];

  // Live Runtime & OLED Framebuffer
  runtimeRef: React.MutableRefObject<EmoFirmwareRuntime>;
  runtimeSnapshot: RuntimeSnapshot;
  oledVersion: number;
  serialLogs: SerialLogEntry[];
  touchHistory: TouchEventRecord[];
  eventHistory: RuntimeEventRecord[];

  // Simulation Lifecycle Controls
  analyseNow: () => void;
  buildNow: () => boolean;
  runNow: () => void;
  pauseNow: () => void;
  resumeNow: () => void;
  stopNow: () => void;
  restartNow: () => void;
  resetHardwareNow: () => void;

  // Firmware Import & Version Management
  importSnapshot: (params: {
    files: { path: string; name?: string; content: string }[];
    label?: string;
    sourceOrigin: "file_import" | "folder_import" | "paste" | "editor_save";
    notes?: string;
  }) => Promise<FirmwareSnapshotRecord | null>;
  activateSnapshot: (snapshotId: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;

  // Hardware Module Self-Extension
  extendModule: (moduleId: string) => Promise<ExtensionRunReport | null>;
  rollbackModule: (moduleId: string) => Promise<void>;
  testModule: (moduleId: string) => Promise<ModuleTestSuiteResult | null>;

  // Hardware & Customization Persistence
  updateHardwareConfig: (next: HardwareConfig) => Promise<void>;
  updateCustomization: (next: CustomizationConfig) => Promise<void>;
  updateSettings: (next: Partial<AppSettingsData>) => Promise<void>;

  // Project Management
  selectProject: (projectId: string) => Promise<void>;
  createProject: (name: string, description?: string, boardType?: string) => Promise<void>;
  renameProject: (projectId: string, name: string, description?: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Hardware Inputs & Serial
  setTouchPressed: (sensor: "MAIN_TOUCH" | "WAKE_TOUCH", pressed: boolean) => void;
  triggerTouchGesture: (
    sensor: "MAIN_TOUCH" | "WAKE_TOUCH" | "BOTH",
    gesture: "SHORT_PRESS" | "LONG_PRESS" | "DOUBLE_TAP" | "BOTH_HOLD"
  ) => void;
  setDigitalPin: (pin: number, val: 0 | 1) => void;
  setAnalogPin: (pin: number, val: number) => void;
  setMicLevel: (level: number) => void;
  setImuValues: (partial: Partial<RuntimeSnapshot["imu"]>) => void;
  sendSerialInput: (text: string) => void;
  clearSerialLogs: () => void;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<NavSection>("robot_studio");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<{ file: string; line: number; seq: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "info" | "success" | "warn" | "error";
    message: string;
  } | null>(null);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [snapshots, setSnapshots] = useState<FirmwareSnapshotRecord[]>([]);
  const [modules, setModules] = useState<PersistedModuleState[]>([]);
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_APP_SETTINGS);

  const [workingFiles, setWorkingFiles] = useState<FirmwareFileData[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<{
    analysisReport: FirmwareAnalysisReport;
    capabilityReport: CapabilityReportEntry[];
  } | null>(null);

  const runtimeRef = useRef<EmoFirmwareRuntime>(
    new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG)
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeSnapshot>(() =>
    runtimeRef.current.getSnapshot()
  );
  const [oledVersion, setOledVersion] = useState(0);
  const [serialLogs, setSerialLogs] = useState<SerialLogEntry[]>([]);
  const [touchHistory, setTouchHistory] = useState<TouchEventRecord[]>([]);
  const [eventHistory, setEventHistory] = useState<RuntimeEventRecord[]>([]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const showToast = useCallback(
    (type: "info" | "success" | "warn" | "error", message: string) => {
      setToast({ type, message });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 4200);
    },
    []
  );

  const syncRuntimeToReact = useCallback(() => {
    const rt = runtimeRef.current;
    setRuntimeSnapshot(rt.getSnapshot());
    setOledVersion((v) => v + 1);
    setSerialLogs([...rt.serialLogs]);
    setTouchHistory([...rt.touchHistory]);
    setEventHistory([...rt.eventHistory]);
  }, []);

  const activeSnapshot = useMemo(() => {
    if (!activeProject?.activeSnapshotId) return null;
    return snapshots.find((s) => s.id === activeProject.activeSnapshotId) ?? null;
  }, [activeProject, snapshots]);

  const hasUnsavedChanges = useMemo(() => {
    if (!activeSnapshot) return workingFiles.length > 0;
    if (workingFiles.length !== activeSnapshot.files.length) return true;
    const origMap = new Map(activeSnapshot.files.map((f) => [f.path, f.content]));
    for (const wf of workingFiles) {
      if (origMap.get(wf.path) !== wf.content) return true;
    }
    return false;
  }, [activeSnapshot, workingFiles]);

  // Bootstrap from PostgreSQL on mount
  const loadWorkspace = useCallback(
    async (projectId?: string) => {
      try {
        setLoading(true);
        const url = projectId
          ? `/api/bootstrap?projectId=${encodeURIComponent(projectId)}`
          : "/api/bootstrap";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load workspace");
        const data = await res.json();

        setProjects(data.projects ?? []);
        setActiveProject(data.activeProject ?? null);
        setSnapshots(data.snapshots ?? []);
        setModules(data.modules ?? []);
        setSettings(data.settings ?? DEFAULT_APP_SETTINGS);

        const hw: HardwareConfig =
          data.activeProject?.hardwareConfig ?? DEFAULT_HARDWARE_CONFIG;
        runtimeRef.current.reset();
        runtimeRef.current.updateHardwareConfig(hw);
        runtimeRef.current.updateModules(data.modules ?? []);
        runtimeRef.current.setLimits(
          data.settings?.maxInstructionsPerTick ?? 24000,
          data.settings?.maxCallStackDepth ?? 64
        );

        const activeSnap: FirmwareSnapshotRecord | null = data.activeProject?.activeSnapshotId
          ? (data.snapshots ?? []).find(
              (s: FirmwareSnapshotRecord) => s.id === data.activeProject.activeSnapshotId
            ) ?? null
          : null;

        if (activeSnap) {
          setWorkingFiles(activeSnap.files);
          setActiveFilePath(activeSnap.files[0]?.path ?? null);
        } else {
          setWorkingFiles([]);
          setActiveFilePath(null);
        }
        setLocalAnalysis(null);
        syncRuntimeToReact();
      } catch (err) {
        console.error(err);
        showToast("error", "Could not connect to workspace database.");
      } finally {
        setLoading(false);
      }
    },
    [showToast, syncRuntimeToReact]
  );

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Main animation/simulation tick loop
  const simSpeedRef = useRef(1.0);
  const targetFpsRef = useRef(60);

  useEffect(() => {
    const cust = activeProject?.customization ?? DEFAULT_CUSTOMIZATION;
    simSpeedRef.current = cust.rendering?.simulationSpeed ?? 1.0;
    targetFpsRef.current = cust.rendering?.targetFps ?? 60;
  }, [activeProject]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let lastUiSync = performance.now();

    const tick = (now: number) => {
      const rawDelta = Math.min(80, Math.max(0, now - lastTime));
      lastTime = now;

      const rt = runtimeRef.current;
      if (rt.state === "RUNNING") {
        const frameInterval = 1000 / Math.max(15, targetFpsRef.current);
        rt.step(rawDelta * simSpeedRef.current);
        if (now - lastUiSync >= Math.max(16, frameInterval * 0.8)) {
          lastUiSync = now;
          syncRuntimeToReact();
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      for (const t of gestureTimersRef.current) clearTimeout(t);
    };
  }, [syncRuntimeToReact]);

  // Derived Analysis & Capabilities with live runtime ACTIVE badges
  const currentAnalysis = useMemo(() => {
    if (localAnalysis) return localAnalysis.analysisReport;
    return activeSnapshot?.analysisReport ?? null;
  }, [localAnalysis, activeSnapshot]);

  const currentCapabilities = useMemo(() => {
    const base = localAnalysis
      ? localAnalysis.capabilityReport
      : activeSnapshot?.capabilityReport ?? [];

    const activeSet = new Set(runtimeSnapshot.activeModules);
    if (base.length === 0) {
      // Even when no firmware imported, generate empty NOT_DETECTED report reflecting current registry
      return analyzeFirmware([], modules, runtimeSnapshot.activeModules).capabilityReport;
    }
    return base.map((entry) => ({
      ...entry,
      runtimeStatus: !entry.detected
        ? ("INACTIVE" as const)
        : activeSet.has(entry.moduleId)
        ? ("ACTIVE" as const)
        : entry.simulatorSupport !== "UNSUPPORTED"
        ? ("READY" as const)
        : ("INACTIVE" as const),
    }));
  }, [localAnalysis, activeSnapshot, modules, runtimeSnapshot.activeModules]);

  // === SIMULATION CONTROLS ===
  const analyseNow = useCallback(() => {
    if (workingFiles.length === 0) {
      showToast("warn", "No firmware loaded. Click IMPORT CODE to load .ino / .cpp / .h files.");
      return;
    }
    const res = analyzeFirmware(workingFiles, modules, runtimeRef.current.getSnapshot().activeModules);
    setLocalAnalysis(res);
    if (runtimeRef.current.state === "IDLE") {
      runtimeRef.current.state = "ANALYZED";
      syncRuntimeToReact();
    }
    showToast(
      res.analysisReport.canExecute ? "success" : "warn",
      res.analysisReport.summary
    );
  }, [workingFiles, modules, showToast, syncRuntimeToReact]);

  const buildNow = useCallback(() => {
    if (workingFiles.length === 0) {
      showToast("warn", "Import firmware first before building execution plan.");
      return false;
    }
    // Always analyse working files too so diagnostics stay fresh
    const analysis = analyzeFirmware(workingFiles, modules);
    setLocalAnalysis(analysis);
    const res = runtimeRef.current.build(workingFiles);
    syncRuntimeToReact();
    if (res.ok) {
      showToast("success", "AST execution plan built (safe interpreter mode — ready to run).");
    } else {
      showToast("error", res.diagnostics[0]?.message ?? "Build failed with errors.");
    }
    return res.ok;
  }, [workingFiles, modules, showToast, syncRuntimeToReact]);

  const runNow = useCallback(() => {
    if (workingFiles.length === 0) {
      showToast("warn", "Virtual robot is empty. Click IMPORT CODE to import firmware first.");
      setImportModalOpen(true);
      return;
    }
    const rt = runtimeRef.current;
    if (rt.state === "PAUSED") {
      rt.resume();
      syncRuntimeToReact();
      return;
    }
    if (rt.state !== "BUILT" || hasUnsavedChanges) {
      const ok = buildNow();
      if (!ok) return;
    }
    rt.start();
    syncRuntimeToReact();
    showToast("info", "Firmware running in safe AST interpreter.");
  }, [workingFiles, hasUnsavedChanges, buildNow, syncRuntimeToReact, showToast]);

  const pauseNow = useCallback(() => {
    runtimeRef.current.pause();
    syncRuntimeToReact();
  }, [syncRuntimeToReact]);

  const resumeNow = useCallback(() => {
    runtimeRef.current.resume();
    syncRuntimeToReact();
  }, [syncRuntimeToReact]);

  const stopNow = useCallback(() => {
    runtimeRef.current.stop();
    syncRuntimeToReact();
  }, [syncRuntimeToReact]);

  const restartNow = useCallback(() => {
    if (workingFiles.length === 0) return;
    const ok = buildNow();
    if (ok) {
      runtimeRef.current.start();
      syncRuntimeToReact();
      showToast("info", "Firmware restarted from setup().");
    }
  }, [workingFiles, buildNow, syncRuntimeToReact, showToast]);

  const resetHardwareNow = useCallback(() => {
    runtimeRef.current.reset();
    syncRuntimeToReact();
    showToast("info", "Virtual hardware & OLED display reset to blank neutral state.");
  }, [syncRuntimeToReact, showToast]);

  // === IMPORT & VERSIONING ===
  const importSnapshot = useCallback(
    async (params: {
      files: { path: string; name?: string; content: string }[];
      label?: string;
      sourceOrigin: "file_import" | "folder_import" | "paste" | "editor_save";
      notes?: string;
    }) => {
      if (!activeProject) return null;
      try {
        setBusyAction("Importing & analysing firmware...");
        const res = await fetch(`/api/projects/${activeProject.id}/snapshots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Import failed");
        }
        const data = await res.json();
        const snap: FirmwareSnapshotRecord = data.snapshot;

        // Reset runtime cleanly for the new firmware snapshot (OLED stays blank until user presses RUN!)
        runtimeRef.current.reset();
        runtimeRef.current.state = "ANALYZED";

        setSnapshots((prev) => [snap, ...prev]);
        setActiveProject((prev) =>
          prev ? { ...prev, activeSnapshotId: snap.id, snapshotCount: (prev.snapshotCount ?? 0) + 1 } : prev
        );
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id
              ? { ...p, activeSnapshotId: snap.id, snapshotCount: (p.snapshotCount ?? 0) + 1 }
              : p
          )
        );
        setWorkingFiles(snap.files);
        setActiveFilePath(snap.files[0]?.path ?? null);
        setLocalAnalysis(null);
        syncRuntimeToReact();

        showToast(
          snap.analysisReport?.canExecute ? "success" : "warn",
          `Imported ${snap.label} — ${snap.analysisReport?.summary ?? "Analysis complete."}`
        );
        return snap;
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Import failed");
        return null;
      } finally {
        setBusyAction(null);
      }
    },
    [activeProject, showToast, syncRuntimeToReact]
  );

  const activateSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!activeProject) return;
      const target = snapshots.find((s) => s.id === snapshotId);
      if (!target) return;
      try {
        setBusyAction("Switching firmware version...");
        const res = await fetch(
          `/api/projects/${activeProject.id}/snapshots/${snapshotId}/activate`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error("Failed to switch version");
        runtimeRef.current.reset();
        setActiveProject((prev) => (prev ? { ...prev, activeSnapshotId: snapshotId } : prev));
        setWorkingFiles(target.files);
        setActiveFilePath(target.files[0]?.path ?? null);
        setLocalAnalysis(null);
        syncRuntimeToReact();
        showToast("success", `Switched active firmware to ${target.label}.`);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Switch failed");
      } finally {
        setBusyAction(null);
      }
    },
    [activeProject, snapshots, showToast, syncRuntimeToReact]
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!activeProject) return;
      try {
        setBusyAction("Deleting snapshot...");
        const res = await fetch(
          `/api/projects/${activeProject.id}/snapshots/${snapshotId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Delete failed");
        const data = await res.json();
        const remaining = snapshots.filter((s) => s.id !== snapshotId);
        setSnapshots(remaining);
        const nextActiveId: string | null = data.activeSnapshotId ?? null;
        setActiveProject((prev) =>
          prev
            ? { ...prev, activeSnapshotId: nextActiveId, snapshotCount: remaining.length }
            : prev
        );
        const nextActive = remaining.find((s) => s.id === nextActiveId) ?? null;
        setWorkingFiles(nextActive ? nextActive.files : []);
        setActiveFilePath(nextActive?.files[0]?.path ?? null);
        setLocalAnalysis(null);
        runtimeRef.current.reset();
        syncRuntimeToReact();
        showToast("info", "Firmware snapshot deleted.");
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyAction(null);
      }
    },
    [activeProject, snapshots, showToast, syncRuntimeToReact]
  );

  // === MODULE SELF-EXTENSION ===
  const extendModule = useCallback(
    async (moduleId: string): Promise<ExtensionRunReport | null> => {
      try {
        setBusyAction(`Implementing simulator support for ${moduleId}...`);
        const res = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/extend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: activeSnapshot?.id ?? null }),
        });
        if (!res.ok) throw new Error("Extension workflow failed");
        const data = await res.json();

        setModules(data.modules);
        runtimeRef.current.updateModules(data.modules);

        if (activeSnapshot && data.reanalysis) {
          setSnapshots((prev) =>
            prev.map((s) =>
              s.id === activeSnapshot.id
                ? {
                    ...s,
                    analysisReport: data.reanalysis.analysisReport,
                    capabilityReport: data.reanalysis.capabilityReport,
                  }
                : s
            )
          );
        }
        if (workingFiles.length > 0) {
          setLocalAnalysis(analyzeFirmware(workingFiles, data.modules));
        }

        showToast(
          data.success ? "success" : "warn",
          data.success
            ? `Implemented ${data.updatedModule.name} (${data.finalStatus}) — ${data.testResult.passed}/${data.testResult.total} tests passed.`
            : `${data.updatedModule.name}: Browser hardware limitation — cannot be falsely marked supported.`
        );

        return {
          moduleId,
          success: data.success,
          finalStatus: data.finalStatus,
          steps: data.steps,
          testResult: data.testResult,
        };
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Extension failed");
        return null;
      } finally {
        setBusyAction(null);
      }
    },
    [activeSnapshot, workingFiles, showToast]
  );

  const rollbackModule = useCallback(
    async (moduleId: string) => {
      try {
        setBusyAction(`Rolling back simulator module ${moduleId}...`);
        const res = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/rollback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: activeSnapshot?.id ?? null }),
        });
        if (!res.ok) throw new Error("Rollback failed");
        const data = await res.json();
        setModules(data.modules);
        runtimeRef.current.updateModules(data.modules);

        if (activeSnapshot && data.reanalysis) {
          setSnapshots((prev) =>
            prev.map((s) =>
              s.id === activeSnapshot.id
                ? {
                    ...s,
                    analysisReport: data.reanalysis.analysisReport,
                    capabilityReport: data.reanalysis.capabilityReport,
                  }
                : s
            )
          );
        }
        if (workingFiles.length > 0) {
          setLocalAnalysis(analyzeFirmware(workingFiles, data.modules));
        }
        showToast("info", `Rolled back ${data.updatedModule.name} to previous state.`);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Rollback failed");
      } finally {
        setBusyAction(null);
      }
    },
    [activeSnapshot, workingFiles, showToast]
  );

  const testModule = useCallback(
    async (moduleId: string): Promise<ModuleTestSuiteResult | null> => {
      try {
        const res = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/test`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Test run failed");
        const data = await res.json();
        setModules(data.modules);
        showToast(
          data.testResult.allPassed ? "success" : "warn",
          `Tests for ${moduleId}: ${data.testResult.passed}/${data.testResult.total} passed.`
        );
        return data.testResult;
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Test execution failed");
        return null;
      }
    },
    [showToast]
  );

  // === HARDWARE / CUSTOMIZATION / SETTINGS ===
  const updateHardwareConfig = useCallback(
    async (next: HardwareConfig) => {
      runtimeRef.current.updateHardwareConfig(next);
      syncRuntimeToReact();
      if (!activeProject) return;
      setActiveProject((prev) =>
        prev ? { ...prev, hardwareConfig: next, boardType: next.boardType } : prev
      );
      await fetch(`/api/projects/${activeProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardwareConfig: next, boardType: next.boardType }),
      });
    },
    [activeProject, syncRuntimeToReact]
  );

  const updateCustomization = useCallback(
    async (next: CustomizationConfig) => {
      if (!activeProject) return;
      setActiveProject((prev) => (prev ? { ...prev, customization: next } : prev));
      await fetch(`/api/projects/${activeProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customization: next }),
      });
    },
    [activeProject]
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettingsData>) => {
      const merged = { ...settings, ...patch };
      setSettings(merged);
      runtimeRef.current.setLimits(
        merged.maxInstructionsPerTick,
        merged.maxCallStackDepth
      );
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      showToast("success", "Settings saved.");
    },
    [settings, showToast]
  );

  // === PROJECT MANAGEMENT ===
  const selectProject = useCallback(
    async (projectId: string) => {
      await loadWorkspace(projectId);
    },
    [loadWorkspace]
  );

  const createProject = useCallback(
    async (name: string, description = "", boardType = "ESP32 DevKit V1") => {
      try {
        setBusyAction("Creating project...");
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, boardType }),
        });
        if (!res.ok) throw new Error("Failed to create project");
        const data = await res.json();
        await loadWorkspace(data.project.id);
        showToast("success", `Created empty project "${name}".`);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Create project failed");
      } finally {
        setBusyAction(null);
      }
    },
    [loadWorkspace, showToast]
  );

  const renameProject = useCallback(
    async (projectId: string, name: string, description?: string) => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...(description !== undefined ? { description } : {}) }),
      });
      if (!res.ok) {
        showToast("error", "Failed to rename project.");
        return;
      }
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, name, description: description ?? p.description }
            : p
        )
      );
      if (activeProject?.id === projectId) {
        setActiveProject((prev) =>
          prev ? { ...prev, name, description: description ?? prev.description } : prev
        );
      }
      showToast("success", `Project updated to "${name}".`);
    },
    [activeProject, showToast]
  );

  const duplicateProject = useCallback(
    async (projectId: string) => {
      try {
        setBusyAction("Duplicating project...");
        const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
        if (!res.ok) throw new Error("Duplicate failed");
        const data = await res.json();
        await loadWorkspace(data.project.id);
        showToast("success", `Duplicated project as "${data.project.name}".`);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Duplicate failed");
      } finally {
        setBusyAction(null);
      }
    },
    [loadWorkspace, showToast]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (projects.length <= 1) {
        showToast("warn", "Cannot delete the last remaining workspace project.");
        return;
      }
      try {
        setBusyAction("Deleting project...");
        const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        const nextProj = projects.find((p) => p.id !== projectId);
        await loadWorkspace(nextProj?.id);
        showToast("info", "Project deleted.");
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyAction(null);
      }
    },
    [projects, loadWorkspace, showToast]
  );

  // === HARDWARE INPUT INJECTION ===
  const setTouchPressed = useCallback(
    (sensor: "MAIN_TOUCH" | "WAKE_TOUCH", pressed: boolean) => {
      runtimeRef.current.setTouchSensor(sensor, pressed);
      syncRuntimeToReact();
    },
    [syncRuntimeToReact]
  );

  const triggerTouchGesture = useCallback(
    (
      sensor: "MAIN_TOUCH" | "WAKE_TOUCH" | "BOTH",
      gesture: "SHORT_PRESS" | "LONG_PRESS" | "DOUBLE_TAP" | "BOTH_HOLD"
    ) => {
      const cfg = activeProject?.hardwareConfig ?? DEFAULT_HARDWARE_CONFIG;
      const schedule = (fn: () => void, ms: number) => {
        const id = setTimeout(() => {
          fn();
          syncRuntimeToReact();
        }, ms);
        gestureTimersRef.current.push(id);
      };

      const rt = runtimeRef.current;
      if (gesture === "BOTH_HOLD" || sensor === "BOTH") {
        rt.setTouchSensor("MAIN_TOUCH", true, "BOTH_HOLD");
        rt.setTouchSensor("WAKE_TOUCH", true, "BOTH_HOLD");
        syncRuntimeToReact();
        schedule(() => {
          rt.setTouchSensor("MAIN_TOUCH", false, "RELEASE");
          rt.setTouchSensor("WAKE_TOUCH", false, "RELEASE");
        }, Math.max(400, cfg.touch.bothTouchHoldMs + 120));
        return;
      }

      if (gesture === "SHORT_PRESS") {
        rt.setTouchSensor(sensor, true, "SHORT_PRESS");
        syncRuntimeToReact();
        schedule(() => rt.setTouchSensor(sensor, false, "RELEASE"), Math.max(80, cfg.touch.debounceMs + 60));
      } else if (gesture === "LONG_PRESS") {
        rt.setTouchSensor(sensor, true, "LONG_PRESS");
        syncRuntimeToReact();
        schedule(() => rt.setTouchSensor(sensor, false, "RELEASE"), Math.max(250, cfg.touch.longPressMs + 120));
      } else if (gesture === "DOUBLE_TAP") {
        const tapDur = Math.max(60, cfg.touch.debounceMs + 45);
        const gap = Math.min(220, Math.max(80, Math.round(cfg.touch.tapIntervalMs * 0.45)));
        rt.setTouchSensor(sensor, true, "DOUBLE_TAP");
        syncRuntimeToReact();
        schedule(() => rt.setTouchSensor(sensor, false, "RELEASE"), tapDur);
        schedule(() => rt.setTouchSensor(sensor, true, "DOUBLE_TAP"), tapDur + gap);
        schedule(() => rt.setTouchSensor(sensor, false, "RELEASE"), tapDur * 2 + gap);
      }
    },
    [activeProject, syncRuntimeToReact]
  );

  const setDigitalPin = useCallback(
    (pin: number, val: 0 | 1) => {
      runtimeRef.current.setExternalDigitalPin(pin, val);
      syncRuntimeToReact();
    },
    [syncRuntimeToReact]
  );

  const setAnalogPin = useCallback(
    (pin: number, val: number) => {
      runtimeRef.current.setExternalAnalogPin(pin, val);
      syncRuntimeToReact();
    },
    [syncRuntimeToReact]
  );

  const setMicLevel = useCallback(
    (level: number) => {
      runtimeRef.current.setMicLevel(level);
      syncRuntimeToReact();
    },
    [syncRuntimeToReact]
  );

  const setImuValues = useCallback(
    (partial: Partial<RuntimeSnapshot["imu"]>) => {
      runtimeRef.current.setImuValues(partial);
      syncRuntimeToReact();
    },
    [syncRuntimeToReact]
  );

  const sendSerialInput = useCallback(
    (text: string) => {
      runtimeRef.current.pushSerialInput(text);
      syncRuntimeToReact();
    },
    [syncRuntimeToReact]
  );

  const clearSerialLogs = useCallback(() => {
    runtimeRef.current.clearLogs();
    syncRuntimeToReact();
  }, [syncRuntimeToReact]);

  const jumpToCode = useCallback((file: string, line = 1) => {
    setActiveFilePath(file);
    setJumpTarget((prev) => ({ file, line, seq: (prev?.seq ?? 0) + 1 }));
    setActiveSection("code_studio");
  }, []);

  const value: SimulatorContextValue = {
    activeSection,
    setActiveSection,
    importModalOpen,
    setImportModalOpen,
    jumpTarget,
    jumpToCode,
    loading,
    busyAction,
    toast,
    showToast,
    projects,
    activeProject,
    snapshots,
    activeSnapshot,
    modules,
    settings,
    workingFiles,
    setWorkingFiles,
    hasUnsavedChanges,
    activeFilePath,
    setActiveFilePath,
    currentAnalysis,
    currentCapabilities,
    runtimeRef,
    runtimeSnapshot,
    oledVersion,
    serialLogs,
    touchHistory,
    eventHistory,
    analyseNow,
    buildNow,
    runNow,
    pauseNow,
    resumeNow,
    stopNow,
    restartNow,
    resetHardwareNow,
    importSnapshot,
    activateSnapshot,
    deleteSnapshot,
    extendModule,
    rollbackModule,
    testModule,
    updateHardwareConfig,
    updateCustomization,
    updateSettings,
    selectProject,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
    setTouchPressed,
    triggerTouchGesture,
    setDigitalPin,
    setAnalogPin,
    setMicLevel,
    setImuValues,
    sendSerialInput,
    clearSerialLogs,
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used inside SimulatorProvider");
  return ctx;
}
