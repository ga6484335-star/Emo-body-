"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Bug,
  CheckCircle2,
  Cpu,
  Database,
  FlaskConical,
  Hand,
  Monitor,
  XCircle,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";
import { OledCanvas } from "../OledCanvas";
import { DEFAULT_CUSTOMIZATION } from "@/lib/simulator/types";

export function DiagnosticsView() {
  const {
    activeProject,
    runtimeRef,
    runtimeSnapshot,
    oledVersion,
    touchHistory,
    eventHistory,
    currentAnalysis,
    modules,
    testModule,
    showToast,
  } = useSimulator();

  const cust = activeProject?.customization ?? DEFAULT_CUSTOMIZATION;
  const [showHexDump, setShowHexDump] = useState(false);
  const [runningAllTests, setRunningAllTests] = useState(false);

  const hexPreview = useMemo(() => {
    if (!showHexDump) return "";
    const bytes = runtimeRef.current.oled.getPageBytes();
    const rows: string[] = [];
    for (let p = 0; p < 8; p++) {
      const slice = Array.from(bytes.slice(p * 128, p * 128 + 16))
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");
      rows.push(`PAGE ${p} [0x${(p * 128).toString(16).padStart(3, "0")}]: ${slice} ...`);
    }
    return rows.join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHexDump, oledVersion]);

  const activeGpioPins = useMemo(() => {
    return Object.values(runtimeSnapshot.pins).filter(
      (p) => p.mode !== "UNCONFIGURED" || p.digitalValue === 1 || p.pwmValue > 0 || p.label
    );
  }, [runtimeSnapshot.pins]);

  const varEntries = Object.entries(runtimeSnapshot.variables);

  const handleRunAllModuleTests = async () => {
    setRunningAllTests(true);
    let passedMods = 0;
    for (const m of modules) {
      if (m.enabled) {
        const res = await testModule(m.id);
        if (res?.allPassed) passedMods++;
      }
    }
    setRunningAllTests(false);
    showToast("success", `Executed automated verification across ${passedMods} active module(s).`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Bug className="w-4 h-4 text-cyan-400" />
            Runtime Diagnostics &amp; Hardware State Inspector
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Displays only real runtime state produced by the AST interpreter and virtual hardware modules — zero fabricated values.
          </p>
        </div>
        <button
          type="button"
          disabled={runningAllTests}
          onClick={handleRunAllModuleTests}
          className="px-3.5 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          {runningAllTests ? "Running Module Suites..." : "Run Active Module Self-Tests"}
        </button>
      </div>

      {/* Top Runtime Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <div className="rounded-xl border border-[#1A2333] bg-[#0B0F17] p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Execution State</div>
          <div className="text-sm font-mono font-semibold text-cyan-300 mt-0.5">
            {runtimeSnapshot.state}
          </div>
        </div>
        <div className="rounded-xl border border-[#1A2333] bg-[#0B0F17] p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Sim Clock</div>
          <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5">
            {runtimeSnapshot.simTimeMs} ms
          </div>
        </div>
        <div className="rounded-xl border border-[#1A2333] bg-[#0B0F17] p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Loop Cycles</div>
          <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5">
            {runtimeSnapshot.loopIterations.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-[#1A2333] bg-[#0B0F17] p-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase">AST Instructions</div>
          <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5">
            {runtimeSnapshot.instructionsExecuted.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-[#1A2333] bg-[#0B0F17] p-3 col-span-2 md:col-span-1">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Static RAM Est.</div>
          <div className="text-sm font-mono font-semibold text-emerald-300 mt-0.5">
            {currentAnalysis ? `${currentAnalysis.estimatedRamBytes} B` : "—"}
          </div>
        </div>
      </div>

      {/* Main Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Supported Variable Inspector */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#1A2333] bg-[#0D1320] flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Global Variable Inspector ({varEntries.length})
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Live interpreter globals</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-[#141D2D] text-xs font-mono">
            {varEntries.length === 0 ? (
              <div className="p-4 text-slate-500">
                No runtime variables populated yet. Build or run imported firmware to inspect variables.
              </div>
            ) : (
              varEntries.map(([name, info]) => (
                <div key={name} className="px-4 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-cyan-300">{name}</span>
                    <span className="text-slate-500 ml-2 text-[10px]">{info.type}</span>
                  </div>
                  <span className="text-slate-200 truncate max-w-[55%]">{info.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. OLED 128x64 Framebuffer Inspector */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#1A2333] bg-[#0D1320] flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              OLED 128×64 Framebuffer Inspector
            </h2>
            <button
              type="button"
              onClick={() => setShowHexDump((v) => !v)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
            >
              {showHexDump ? "Hide Page Hex" : "Inspect 1024B Hex"}
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-56 shrink-0 rounded-lg border border-[#1E2B42] p-1.5 bg-[#020408]">
                <OledCanvas
                  oled={runtimeRef.current.oled}
                  version={oledVersion}
                  customization={cust}
                  compact
                />
              </div>
              <div className="flex-1 text-xs font-mono space-y-1.5 text-slate-300">
                <div>Initialized: {runtimeSnapshot.oledInitialized ? "YES (0x3C)" : "NO"}</div>
                <div>Committed Frames: {runtimeSnapshot.oledFrameCount}</div>
                <div>Active Pixels: {runtimeSnapshot.oledActivePixels} / 8192</div>
                <div>
                  Inverted: {runtimeSnapshot.oledInverted ? "ON" : "OFF"} · Dim:{" "}
                  {runtimeSnapshot.oledDimmed ? "ON" : "OFF"}
                </div>
              </div>
            </div>
            {showHexDump && (
              <pre className="p-2.5 rounded-lg bg-[#06090F] border border-[#192336] text-[10px] font-mono text-cyan-200/80 overflow-x-auto leading-relaxed">
                {hexPreview}
              </pre>
            )}
          </div>
        </div>

        {/* 3. Touch Event History & Virtual NVS */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#1A2333] bg-[#0D1320] flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-cyan-400" />
              Touch Event History ({touchHistory.length})
            </h2>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-[#141D2D] text-xs font-mono">
            {touchHistory.length === 0 ? (
              <div className="p-4 text-slate-500">
                No touch sensor events triggered yet. Press Head Touch or Wake Touch in Robot Studio or Hardware Lab.
              </div>
            ) : (
              [...touchHistory].reverse().map((ev) => (
                <div key={ev.id} className="px-4 py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">{ev.timestampMs}ms</span>
                  <span className="text-cyan-300">
                    {ev.sensor} (GPIO{ev.pin})
                  </span>
                  <span className="text-slate-200">{ev.eventType}</span>
                  <span className={ev.value ? "text-emerald-400" : "text-slate-500"}>
                    {ev.value ? "HIGH" : "LOW"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Virtual NVS Storage & GPIO States */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#1A2333] bg-[#0D1320] flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Simulated Virtual NVS &amp; Active GPIOs
            </h2>
            <span className="text-[10px] font-mono text-amber-300">SIMULATED — NOT ESP32 FLASH</span>
          </div>
          <div className="p-3.5 space-y-3 max-h-56 overflow-y-auto text-xs font-mono">
            {Object.keys(runtimeSnapshot.nvsStorage).length === 0 ? (
              <div className="text-slate-500">Virtual NVS storage is currently empty.</div>
            ) : (
              <pre className="p-2.5 rounded-lg bg-[#06090F] border border-[#1A2333] text-[11px] text-emerald-300 overflow-x-auto">
                {JSON.stringify(runtimeSnapshot.nvsStorage, null, 2)}
              </pre>
            )}

            <div className="pt-2 border-t border-[#1A2333]">
              <div className="text-[10px] uppercase text-slate-500 mb-1.5">
                Configured / Active GPIOs ({activeGpioPins.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeGpioPins.map((p) => (
                  <span
                    key={p.pin}
                    className={`px-2 py-1 rounded-md border text-[10px] ${
                      p.digitalValue === 1
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                        : "bg-[#0D1320] border-[#1A2333] text-slate-400"
                    }`}
                  >
                    G{p.pin} {p.label ? `(${p.label})` : ""}: {p.digitalValue ? "HIGH" : "LOW"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Runtime Event History & Module Test Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1A2333] bg-[#0D1320]">
            <h2 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Runtime Event History ({eventHistory.length})
            </h2>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-[#141D2D] text-xs font-mono">
            {eventHistory.length === 0 ? (
              <div className="p-4 text-slate-500">No runtime events recorded yet.</div>
            ) : (
              [...eventHistory].reverse().map((ev) => (
                <div key={ev.id} className="px-3.5 py-2 flex items-start gap-2">
                  <span className="text-[10px] text-slate-500 shrink-0">{ev.timestampMs}ms</span>
                  <span className="text-[10px] uppercase px-1.5 rounded bg-slate-800 text-cyan-300 shrink-0">
                    {ev.category}
                  </span>
                  <span
                    className={
                      ev.category === "error"
                        ? "text-rose-300"
                        : ev.category === "warning"
                        ? "text-amber-300"
                        : "text-slate-300"
                    }
                  >
                    {ev.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1A2333] bg-[#0D1320]">
            <h2 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              Simulator Module Test Registry Status
            </h2>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-[#141D2D] text-xs font-mono">
            {modules.map((m) => (
              <div key={m.id} className="px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-slate-200 truncate">{m.name}</div>
                  <div className="text-[10px] text-slate-500">{m.supportLevel}</div>
                </div>
                {m.lastTestResult ? (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] ${
                      m.lastTestResult.allPassed ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {m.lastTestResult.allPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {m.lastTestResult.passed}/{m.lastTestResult.total}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Not run yet</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
