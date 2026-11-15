"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FlaskConical,
  Info,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { useSimulator, type ExtensionRunReport } from "../SimulatorProvider";
import { HARDWARE_MODULE_MAP } from "@/lib/simulator/modules/registry";
import type { CapabilityReportEntry, CapabilityStatus } from "@/lib/simulator/types";

function StatusBadge({ status }: { status: CapabilityStatus | string }) {
  const styles: Record<string, string> = {
    SUPPORTED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
    PARTIALLY_SUPPORTED: "bg-amber-500/15 text-amber-300 border-amber-500/35",
    UNSUPPORTED: "bg-rose-500/15 text-rose-300 border-rose-500/35",
    NOT_DETECTED: "bg-slate-800/80 text-slate-400 border-slate-700",
    IMPLEMENTING: "bg-sky-500/15 text-sky-300 border-sky-500/40 animate-pulse",
    TESTING: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 animate-pulse",
    FAILED: "bg-rose-600/20 text-rose-200 border-rose-500/50",
    READY: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    ACTIVE: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
    INACTIVE: "bg-slate-900 text-slate-500 border-slate-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border whitespace-nowrap ${
        styles[status] ?? styles.INACTIVE
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function CapabilityCenterView() {
  const {
    currentCapabilities,
    modules,
    workingFiles,
    extendModule,
    rollbackModule,
    testModule,
    jumpToCode,
    setImportModalOpen,
  } = useSimulator();

  const [filter, setFilter] = useState<"all" | "detected" | "gaps" | "extended">("all");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("ssd1306_oled");
  const [liveStatusOverride, setLiveStatusOverride] = useState<
    Record<string, "IMPLEMENTING" | "TESTING" | "FAILED">
  >({});
  const [lastRunReport, setLastRunReport] = useState<ExtensionRunReport | null>(null);

  const hasFirmware = workingFiles.length > 0;

  const filtered = useMemo(() => {
    const sorted = [...currentCapabilities].sort((a, b) => {
      if (a.detected !== b.detected) return a.detected ? -1 : 1;
      const rank = (s: string) => (s === "UNSUPPORTED" ? 0 : s === "PARTIALLY_SUPPORTED" ? 1 : 2);
      return rank(a.simulatorSupport) - rank(b.simulatorSupport);
    });
    if (filter === "detected") return sorted.filter((c) => c.detected);
    if (filter === "gaps")
      return sorted.filter((c) => c.simulatorSupport !== "SUPPORTED");
    if (filter === "extended") return sorted.filter((c) => c.isExtended);
    return sorted;
  }, [currentCapabilities, filter]);

  const selectedEntry: CapabilityReportEntry | null = useMemo(() => {
    return (
      currentCapabilities.find((c) => c.moduleId === selectedModuleId) ??
      filtered[0] ??
      currentCapabilities[0] ??
      null
    );
  }, [currentCapabilities, filtered, selectedModuleId]);

  const selectedModuleState = useMemo(
    () => modules.find((m) => m.id === selectedEntry?.moduleId) ?? null,
    [modules, selectedEntry]
  );

  const selectedModuleDef = useMemo(
    () => (selectedEntry ? HARDWARE_MODULE_MAP.get(selectedEntry.moduleId) ?? null : null),
    [selectedEntry]
  );

  const counts = useMemo(() => {
    const detected = currentCapabilities.filter((c) => c.detected);
    return {
      detected: detected.length,
      supported: detected.filter((c) => c.simulatorSupport === "SUPPORTED").length,
      partial: detected.filter((c) => c.simulatorSupport === "PARTIALLY_SUPPORTED").length,
      unsupported: detected.filter((c) => c.simulatorSupport === "UNSUPPORTED").length,
      active: currentCapabilities.filter((c) => c.runtimeStatus === "ACTIVE").length,
    };
  }, [currentCapabilities]);

  const handleImplementSupport = async (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setLiveStatusOverride((prev) => ({ ...prev, [moduleId]: "IMPLEMENTING" }));

    // Transition honestly into testing stage before committing API call
    await new Promise((r) => setTimeout(r, 120));
    setLiveStatusOverride((prev) => ({ ...prev, [moduleId]: "TESTING" }));

    const report = await extendModule(moduleId);
    if (report) {
      setLastRunReport(report);
      if (!report.success) {
        setLiveStatusOverride((prev) => ({ ...prev, [moduleId]: "FAILED" }));
        return;
      }
    }
    setLiveStatusOverride((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
  };

  const handleRollback = async (moduleId: string) => {
    await rollbackModule(moduleId);
    setLiveStatusOverride((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    if (lastRunReport?.moduleId === moduleId) {
      setLastRunReport(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Capability Summary Banner */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              CAPABILITY CENTER — Hardware Matrix &amp; Self-Extending Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated directly from AST analysis of your imported firmware and the modular hardware registry.
              Extend unsupported browser-simulatable capabilities with automated verification tests.
            </p>
          </div>
          {!hasFirmware && (
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              IMPORT CODE TO ANALYSE
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Detected in Code</div>
            <div className="text-lg font-mono font-semibold text-slate-100">{counts.detected}</div>
          </div>
          <div className="rounded-xl bg-[#0F1521] border border-emerald-500/20 p-3">
            <div className="text-[10px] font-mono text-emerald-400/80 uppercase">Supported</div>
            <div className="text-lg font-mono font-semibold text-emerald-300">{counts.supported}</div>
          </div>
          <div className="rounded-xl bg-[#0F1521] border border-amber-500/20 p-3">
            <div className="text-[10px] font-mono text-amber-400/80 uppercase">Partial</div>
            <div className="text-lg font-mono font-semibold text-amber-300">{counts.partial}</div>
          </div>
          <div className="rounded-xl bg-[#0F1521] border border-rose-500/20 p-3">
            <div className="text-[10px] font-mono text-rose-400/80 uppercase">Unsupported</div>
            <div className="text-lg font-mono font-semibold text-rose-300">{counts.unsupported}</div>
          </div>
          <div className="rounded-xl bg-[#0F1521] border border-cyan-500/20 p-3 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-cyan-400/80 uppercase">Runtime Active</div>
            <div className="text-lg font-mono font-semibold text-cyan-300">{counts.active}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", `All Modules (${currentCapabilities.length})`],
              ["detected", `Detected in Firmware (${counts.detected})`],
              [
                "gaps",
                `Unsupported / Partial (${
                  currentCapabilities.filter((c) => c.simulatorSupport !== "SUPPORTED").length
                })`,
              ],
              [
                "extended",
                `Extended (${currentCapabilities.filter((c) => c.isExtended).length})`,
              ],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                filter === key
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                  : "bg-[#0E1420] border-[#1A2333] text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Capability Table + Technical Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_430px] gap-4">
        {/* Capability Matrix Table */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1A2333] bg-[#0D1320] text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3.5">Feature</th>
                  <th className="py-2.5 px-3">Detected</th>
                  <th className="py-2.5 px-3">Simulator Support</th>
                  <th className="py-2.5 px-3">Runtime</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141D2D] text-xs">
                {filtered.map((entry) => {
                  const isSel = selectedEntry?.moduleId === entry.moduleId;
                  const liveOverride = liveStatusOverride[entry.moduleId];
                  const shownSupport = liveOverride ?? entry.simulatorSupport;
                  return (
                    <tr
                      key={entry.moduleId}
                      onClick={() => setSelectedModuleId(entry.moduleId)}
                      className={`cursor-pointer transition ${
                        isSel ? "bg-cyan-500/10" : "hover:bg-slate-800/35"
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-100 flex items-center gap-1.5">
                          {entry.featureName}
                          {entry.isExtended && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[9px] font-mono text-sky-300">
                              EXTENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">{entry.category}</div>
                      </td>
                      <td className="py-3 px-3">
                        {entry.detected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-cyan-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Yes ({entry.detectionEvidence.length})
                          </span>
                        ) : (
                          <StatusBadge status="NOT_DETECTED" />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={shownSupport} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={entry.runtimeStatus} />
                      </td>
                      <td
                        className="py-3 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.canImplementSupport ? (
                          <button
                            type="button"
                            disabled={liveOverride === "IMPLEMENTING" || liveOverride === "TESTING"}
                            onClick={() => handleImplementSupport(entry.moduleId)}
                            className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 font-mono text-[10px] font-semibold inline-flex items-center gap-1 transition disabled:opacity-50"
                          >
                            {liveOverride === "IMPLEMENTING" || liveOverride === "TESTING" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            IMPLEMENT SUPPORT
                          </button>
                        ) : entry.isExtended ? (
                          <button
                            type="button"
                            onClick={() => handleRollback(entry.moduleId)}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-[10px] inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Rollback
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">Built-in</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Technical Details & Self-Extension Drawer */}
        {selectedEntry && selectedModuleDef && (
          <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-4 h-fit">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#1A2333]">
              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-400">
                  {selectedModuleDef.id} · v{selectedModuleDef.version}
                </div>
                <h2 className="text-sm font-semibold text-slate-100 mt-0.5">
                  {selectedEntry.featureName}
                </h2>
              </div>
              <StatusBadge
                status={liveStatusOverride[selectedEntry.moduleId] ?? selectedEntry.simulatorSupport}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {selectedEntry.canImplementSupport && (
                <button
                  type="button"
                  disabled={
                    liveStatusOverride[selectedEntry.moduleId] === "IMPLEMENTING" ||
                    liveStatusOverride[selectedEntry.moduleId] === "TESTING"
                  }
                  onClick={() => handleImplementSupport(selectedEntry.moduleId)}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  IMPLEMENT SUPPORT
                </button>
              )}
              <button
                type="button"
                onClick={() => testModule(selectedEntry.moduleId)}
                className="py-2 px-3 rounded-lg bg-[#121A2A] hover:bg-[#19243A] border border-[#24324A] text-slate-200 text-xs font-mono flex items-center gap-1.5"
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                Run Tests
              </button>
              {selectedEntry.isExtended && (
                <button
                  type="button"
                  onClick={() => handleRollback(selectedEntry.moduleId)}
                  className="py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-amber-200 text-xs font-mono flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Rollback
                </button>
              )}
            </div>

            {/* Honest Feasibility & Limitations Box */}
            <div
              className={`rounded-xl p-3 border text-xs space-y-1.5 ${
                selectedEntry.browserSimulatable === "IMPOSSIBLE"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : selectedEntry.browserSimulatable === "PARTIAL"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
              }`}
            >
              <div className="font-mono text-[11px] font-semibold flex items-center gap-1.5">
                {selectedEntry.browserSimulatable === "IMPOSSIBLE" ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : selectedEntry.browserSimulatable === "PARTIAL" ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                Browser Simulation Feasibility: {selectedEntry.browserSimulatable}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{selectedEntry.explanation}</p>
              <p className="text-[11px] opacity-85 leading-relaxed">
                <strong>Solution:</strong> {selectedEntry.possibleSolution}
              </p>
            </div>

            {/* Live Self-Extension Pipeline Log (shown immediately after clicking IMPLEMENT SUPPORT) */}
            {lastRunReport && lastRunReport.moduleId === selectedEntry.moduleId && (
              <div className="rounded-xl border border-[#223048] bg-[#080D16] p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-cyan-300 uppercase">Extension Pipeline Execution Log</span>
                  <StatusBadge status={lastRunReport.finalStatus} />
                </div>
                <div className="space-y-1.5">
                  {lastRunReport.steps.map((st, idx) => (
                    <div key={idx} className="text-[11px] flex items-start gap-2">
                      {st.status === "ok" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : st.status === "warn" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-mono text-slate-200">{st.step}</div>
                        <div className="text-slate-400 leading-snug">{st.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Automated Test Suite Results */}
            {selectedModuleState?.lastTestResult && (
              <div className="rounded-xl border border-[#1A2333] bg-[#0D1320] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300">
                    AUTOMATED MODULE TESTS ({selectedModuleState.lastTestResult.passed}/
                    {selectedModuleState.lastTestResult.total})
                  </span>
                  <span
                    className={
                      selectedModuleState.lastTestResult.allPassed
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {selectedModuleState.lastTestResult.allPassed ? "ALL PASSED" : "FAILED"} ·{" "}
                    {selectedModuleState.lastTestResult.durationMs}ms
                  </span>
                </div>
                <div className="space-y-1">
                  {selectedModuleState.lastTestResult.tests.map((t, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-mono flex items-start gap-1.5 py-1 border-t border-[#161F30]"
                    >
                      {t.passed ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-slate-200">{t.name}</div>
                        <div className="text-slate-500 text-[10px]">{t.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detection Evidence in Imported Firmware */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase text-slate-400">
                Detected References in Firmware ({selectedEntry.detectionEvidence.length})
              </div>
              {selectedEntry.detectionEvidence.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono bg-[#0D1320] rounded-lg p-2.5 border border-[#1A2333]">
                  Not referenced in active firmware snapshot.
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {selectedEntry.detectionEvidence.slice(0, 14).map((ev, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => jumpToCode(ev.file, ev.line)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#0D1320] hover:bg-[#131C2E] border border-[#1A2333] flex items-center justify-between gap-2 text-[11px] font-mono transition"
                    >
                      <span className="text-cyan-300 truncate">{ev.symbol}</span>
                      <span className="text-slate-500 shrink-0">
                        {ev.file}:{ev.line}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hardware & Limitations Details */}
            <div className="space-y-2 pt-2 border-t border-[#1A2333] text-xs">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Required Hardware</div>
                <div className="text-slate-300 mt-0.5">
                  {selectedEntry.requiredHardware.join(" · ")}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Supported APIs</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModuleDef.supportedApis.slice(0, 14).map((api) => (
                    <span
                      key={api}
                      className="px-1.5 py-0.5 rounded bg-[#0E1522] border border-[#1C283D] text-[10px] font-mono text-slate-300"
                    >
                      {api}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Documented Limitations
                </div>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px] text-slate-400">
                  {selectedEntry.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
