"use client";

import React, { useState } from "react";
import {
  Bot,
  Bug,
  CircuitBoard,
  Code2,
  Cpu,
  FolderKanban,
  Hammer,
  History,
  Loader2,
  Menu,
  Palette,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  Settings,
  Square,
  Terminal,
  Upload,
  X,
} from "lucide-react";
import { useSimulator } from "./SimulatorProvider";
import { ImportCodeModal } from "./ImportCodeModal";
import { RobotStudioView } from "./sections/RobotStudioView";
import { CodeStudioView } from "./sections/CodeStudioView";
import { ImportManagerView } from "./sections/ImportManagerView";
import { CapabilityCenterView } from "./sections/CapabilityCenterView";
import { HardwareLabView } from "./sections/HardwareLabView";
import { SerialMonitorView } from "./sections/SerialMonitorView";
import { DiagnosticsView } from "./sections/DiagnosticsView";
import { CustomizationView } from "./sections/CustomizationView";
import { ProjectManagerView } from "./sections/ProjectManagerView";
import { SettingsView } from "./sections/SettingsView";
import type { NavSection } from "@/lib/simulator/types";

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "robot_studio", label: "Robot Studio", shortLabel: "Robot", icon: Bot },
  { id: "code_studio", label: "Code Studio", shortLabel: "Code", icon: Code2 },
  { id: "import_manager", label: "Import Manager", shortLabel: "Imports", icon: History },
  { id: "capability_center", label: "Capability Center", shortLabel: "Caps", icon: Cpu },
  { id: "hardware_lab", label: "Hardware Lab", shortLabel: "Lab", icon: CircuitBoard },
  { id: "serial_monitor", label: "Serial Monitor", shortLabel: "Serial", icon: Terminal },
  { id: "diagnostics", label: "Diagnostics", shortLabel: "Debug", icon: Bug },
  { id: "customization", label: "Customization", shortLabel: "Style", icon: Palette },
  { id: "project_manager", label: "Project Manager", shortLabel: "Projects", icon: FolderKanban },
  { id: "settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

export function AppShell() {
  const {
    activeSection,
    setActiveSection,
    setImportModalOpen,
    loading,
    busyAction,
    toast,
    activeProject,
    activeSnapshot,
    snapshots,
    hasUnsavedChanges,
    currentAnalysis,
    currentCapabilities,
    runtimeSnapshot,
    analyseNow,
    buildNow,
    runNow,
    pauseNow,
    resumeNow,
    stopNow,
    restartNow,
    resetHardwareNow,
  } = useSimulator();

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const errorCount =
    currentAnalysis?.diagnostics.filter((d) => d.severity === "error").length ?? 0;
  const unsupportedDetectedCount = currentCapabilities.filter(
    (c) => c.detected && c.simulatorSupport === "UNSUPPORTED"
  ).length;

  const isRunning = runtimeSnapshot.state === "RUNNING";
  const isPaused = runtimeSnapshot.state === "PAUSED";

  const renderSection = () => {
    switch (activeSection) {
      case "robot_studio":
        return <RobotStudioView />;
      case "code_studio":
        return <CodeStudioView />;
      case "import_manager":
        return <ImportManagerView />;
      case "capability_center":
        return <CapabilityCenterView />;
      case "hardware_lab":
        return <HardwareLabView />;
      case "serial_monitor":
        return <SerialMonitorView />;
      case "diagnostics":
        return <DiagnosticsView />;
      case "customization":
        return <CustomizationView />;
      case "project_manager":
        return <ProjectManagerView />;
      case "settings":
        return <SettingsView />;
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#06080D] text-[#F1F5F9]">
      {/* Sticky Top Command Header */}
      <header className="sticky top-0 z-30 border-b border-[#1A2333] bg-[#080C14]/95 backdrop-blur-md">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Brand Emblem + Workspace Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveSection("robot_studio")}
              className="flex items-center gap-2.5 shrink-0 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#121D30] to-[#080D17] border border-cyan-500/40 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.18)]">
                {/* Custom EMO OLED Visor Emblem */}
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-cyan-400" fill="none">
                  <rect
                    x="3"
                    y="6"
                    width="18"
                    height="12"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <rect x="6.5" y="10" width="4" height="4" rx="1.2" fill="currentColor" />
                  <rect x="13.5" y="10" width="4" height="4" rx="1.2" fill="currentColor" />
                </svg>
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-display font-bold tracking-wider text-slate-100 leading-none">
                  EMO VIRTUAL BODY
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[170px]">
                  {activeProject?.name ?? "Loading..."}
                  {activeSnapshot ? ` · v${activeSnapshot.versionNumber}` : " · Empty"}
                  {hasUnsavedChanges ? "*" : ""}
                </div>
              </div>
            </button>
          </div>

          {/* Global Simulation Transport Controls */}
          <div className="flex items-center gap-1 bg-[#0D1320] border border-[#1B2639] rounded-xl p-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={analyseNow}
              title="Analyse Firmware AST"
              className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-[#152033] flex items-center gap-1 transition shrink-0"
            >
              <ScanSearch className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">ANALYSE</span>
            </button>
            <button
              type="button"
              onClick={buildNow}
              title="Build AST Execution Plan"
              className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-[#152033] flex items-center gap-1 transition shrink-0"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">BUILD</span>
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={pauseNow}
                title="Pause Simulation"
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 flex items-center gap-1 transition shrink-0"
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden md:inline">PAUSE</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={resumeNow}
                title="Resume Simulation"
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 flex items-center gap-1 transition shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden md:inline">RESUME</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={runNow}
                title="Run Firmware"
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1 transition shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden md:inline">RUN</span>
              </button>
            )}

            <button
              type="button"
              onClick={stopNow}
              disabled={!isRunning && !isPaused}
              title="Stop Simulation"
              className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-35 flex items-center gap-1 transition shrink-0"
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden xl:inline">STOP</span>
            </button>

            <button
              type="button"
              onClick={restartNow}
              title="Restart From setup()"
              className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-[#152033] flex items-center gap-1 transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">RESTART</span>
            </button>

            <button
              type="button"
              onClick={resetHardwareNow}
              title="Reset Hardware & Blank OLED"
              className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-[#152033] transition shrink-0 hidden sm:inline-flex"
            >
              RESET
            </button>
          </div>

          {/* Prominent IMPORT CODE Primary Button */}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-3 sm:px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(34,211,238,0.28)] shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORT CODE</span>
          </button>
        </div>
      </header>

      {/* Main Content Shell */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop & iPad Left Navigation Rail */}
        <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 border-r border-[#1A2333] bg-[#080B12] p-2.5 gap-1">
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Workbench
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  active
                    ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/35 shadow-[inset_0_0_20px_rgba(34,211,238,0.06)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#101624] border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                  <span className="truncate">{item.label}</span>
                </span>

                {item.id === "code_studio" && errorCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                    {errorCount}
                  </span>
                )}
                {item.id === "capability_center" && unsupportedDetectedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                    {unsupportedDetectedCount}
                  </span>
                )}
                {item.id === "import_manager" && snapshots.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                    {snapshots.length}
                  </span>
                )}
              </button>
            );
          })}

          {/* Bottom Honest Execution Badge */}
          <div className="mt-auto rounded-xl border border-[#182235] bg-[#0B101A] p-3 text-[10px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span>ENGINE</span>
              <span className="text-cyan-400">AST SAFE VM</span>
            </div>
            <div className="text-slate-500 leading-snug">
              Zero eval(). Virtual hardware simulation only — never flashes physical ESP32.
            </div>
          </div>
        </aside>

        {/* Active Section Viewport */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 pb-20 md:pb-5 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
              <p className="text-xs font-mono">Bootstrapping EMO Virtual Body workspace...</p>
            </div>
          ) : (
            renderSection()
          )}
        </main>
      </div>

      {/* Dedicated Mobile Bottom Tab Navigation (iPhone / narrow screens) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#1A2333] bg-[#080C14]/95 backdrop-blur-md pb-safe">
        <div className="grid grid-cols-5 h-14">
          {(
            [
              ["robot_studio", "Robot", Bot],
              ["code_studio", "Code", Code2],
              ["capability_center", "Caps", Cpu],
              ["hardware_lab", "Lab", CircuitBoard],
            ] as const
          ).map(([id, label, Icon]) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSection(id);
                  setMobileMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono transition ${
                  active ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMoreOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono transition ${
              mobileMoreOpen ? "text-cyan-400" : "text-slate-400"
            }`}
          >
            {mobileMoreOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer for the remaining 6 sections */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-14 z-40 border-t border-[#223048] bg-[#0B101A]/98 backdrop-blur-lg p-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.filter(
              (n) =>
                !["robot_studio", "code_studio", "capability_center", "hardware_lab"].includes(n.id)
            ).map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMoreOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border ${
                    active
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                      : "bg-[#0F1624] border-[#1A2333] text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Busy Action Indicator */}
      {busyAction && (
        <div className="fixed bottom-16 md:bottom-5 left-4 z-50 px-3.5 py-2 rounded-xl bg-[#0E1625] border border-cyan-500/40 text-xs font-mono text-cyan-200 shadow-2xl flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          {busyAction}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-16 md:bottom-5 right-4 z-50 max-w-sm px-4 py-2.5 rounded-xl border text-xs shadow-2xl backdrop-blur-md ${
            toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-100"
              : toast.type === "warn"
              ? "bg-amber-950/90 border-amber-500/50 text-amber-100"
              : toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-100"
              : "bg-[#0D1626]/95 border-cyan-500/40 text-cyan-100"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Global Built-in IMPORT CODE Modal */}
      <ImportCodeModal />
    </div>
  );
}
