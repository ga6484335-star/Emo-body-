"use client";

import React, { useMemo, useState } from "react";
import { diffLines } from "diff";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCode2,
  GitCompare,
  History,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";
import type { FirmwareSnapshotRecord } from "@/lib/simulator/types";

export function ImportManagerView() {
  const {
    snapshots,
    activeSnapshot,
    setImportModalOpen,
    activateSnapshot,
    deleteSnapshot,
    setActiveSection,
    showToast,
  } = useSimulator();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string>("");
  const [compareRightId, setCompareRightId] = useState<string>("");
  const [compareFile, setCompareFile] = useState<string>("");

  const inspectedSnapshot = useMemo(() => {
    if (selectedReportId) {
      return snapshots.find((s) => s.id === selectedReportId) ?? activeSnapshot;
    }
    return activeSnapshot ?? snapshots[0] ?? null;
  }, [selectedReportId, snapshots, activeSnapshot]);

  const leftSnap = useMemo(
    () => snapshots.find((s) => s.id === compareLeftId) ?? snapshots[1] ?? snapshots[0] ?? null,
    [snapshots, compareLeftId]
  );
  const rightSnap = useMemo(
    () => snapshots.find((s) => s.id === compareRightId) ?? snapshots[0] ?? null,
    [snapshots, compareRightId]
  );

  const allCompareFilePaths = useMemo(() => {
    const set = new Set<string>();
    leftSnap?.files.forEach((f) => set.add(f.path));
    rightSnap?.files.forEach((f) => set.add(f.path));
    return Array.from(set).sort();
  }, [leftSnap, rightSnap]);

  const activeComparePath = compareFile && allCompareFilePaths.includes(compareFile)
    ? compareFile
    : allCompareFilePaths[0] ?? "";

  const diffChunks = useMemo(() => {
    if (!compareMode || !leftSnap || !rightSnap || !activeComparePath) return [];
    const oldText = leftSnap.files.find((f) => f.path === activeComparePath)?.content ?? "";
    const newText = rightSnap.files.find((f) => f.path === activeComparePath)?.content ?? "";
    return diffLines(oldText, newText);
  }, [compareMode, leftSnap, rightSnap, activeComparePath]);

  const exportSnapshotBundle = (snap: FirmwareSnapshotRecord) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      versionNumber: snap.versionNumber,
      label: snap.label,
      notes: snap.notes,
      files: snap.files.map((f) => ({ path: f.path, content: f.content })),
      analysisReport: snap.analysisReport,
      capabilityReport: snap.capabilityReport,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emo-firmware-v${snap.versionNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", `Exported snapshot v${snap.versionNumber} JSON bundle.`);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Import Manager &amp; Firmware Version History
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Every firmware import creates an immutable versioned snapshot with its own AST analysis and capability report.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snapshots.length >= 2 && (
            <button
              type="button"
              onClick={() => setCompareMode((v) => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                compareMode
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-[#111827] border-[#223048] text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              {compareMode ? "Close Version Diff" : "Compare Versions"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(34,211,238,0.25)]"
          >
            <Upload className="w-3.5 h-3.5" />
            IMPORT CODE
          </button>
        </div>
      </div>

      {/* Empty State */}
      {snapshots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#24324A] bg-[#0B0F17] p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">No Firmware Versions Imported Yet</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Click IMPORT CODE to upload `.ino`, `.cpp`, `.h`, `.hpp`, `.txt` files, drop a firmware folder,
            or paste source code directly. No external AI API key is ever required.
          </p>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            IMPORT CODE
          </button>
        </div>
      ) : compareMode && leftSnap && rightSnap ? (
        /* Version Diff Comparator */
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden">
          <div className="p-4 border-b border-[#1A2333] bg-[#0D1320] flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-400">Base:</span>
              <select
                value={leftSnap.id}
                onChange={(e) => setCompareLeftId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-xs font-mono text-slate-200"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    v{s.versionNumber} — {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-400">Compare To:</span>
              <select
                value={rightSnap.id}
                onChange={(e) => setCompareRightId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-xs font-mono text-slate-200"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    v{s.versionNumber} — {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-400">File:</span>
              <select
                value={activeComparePath}
                onChange={(e) => setCompareFile(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-xs font-mono text-cyan-300"
              >
                {allCompareFilePaths.map((fp) => (
                  <option key={fp} value={fp}>
                    {fp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 max-h-[520px] overflow-auto font-mono text-xs bg-[#070A11]">
            {diffChunks.map((part, idx) => (
              <pre
                key={idx}
                className={`whitespace-pre-wrap px-2 py-0.5 leading-relaxed ${
                  part.added
                    ? "bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400"
                    : part.removed
                    ? "bg-rose-500/15 text-rose-300 border-l-2 border-rose-400"
                    : "text-slate-400"
                }`}
              >
                {part.value
                  .split("\n")
                  .map((line, li, arr) =>
                    li === arr.length - 1 && line === ""
                      ? ""
                      : `${part.added ? "+ " : part.removed ? "- " : "  "}${line}`
                  )
                  .filter((l, li, arr) => !(li === arr.length - 1 && l === ""))
                  .join("\n")}
              </pre>
            ))}
          </div>
        </div>
      ) : (
        /* Snapshot Timeline + Inspected Analysis Report */
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* Versions List */}
          <div className="space-y-2.5">
            {snapshots.map((snap) => {
              const isActive = activeSnapshot?.id === snap.id;
              const isInspected = inspectedSnapshot?.id === snap.id;
              const detectedCount =
                snap.capabilityReport?.filter((c) => c.detected).length ?? 0;
              return (
                <div
                  key={snap.id}
                  onClick={() => setSelectedReportId(snap.id)}
                  className={`rounded-2xl border p-3.5 cursor-pointer transition ${
                    isInspected
                      ? "border-cyan-500/50 bg-[#0F1726]"
                      : "border-[#1A2333] bg-[#0B0F17] hover:border-[#293852]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                          v{snap.versionNumber}
                        </span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-mono text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-semibold text-slate-100 mt-1.5 truncate">
                        {snap.label}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(snap.createdAt).toLocaleString()}
                        </span>
                        <span>· {snap.files.length} file(s)</span>
                        <span>· {detectedCount} feature(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#1A2333] flex flex-wrap items-center gap-1.5">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          activateSnapshot(snap.id);
                        }}
                        className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-[11px] font-mono flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore / Activate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSnapshotBundle(snap);
                      }}
                      className="px-2 py-1 rounded-md bg-[#121A2A] hover:bg-[#19243A] border border-[#1E2A40] text-slate-300 text-[11px] font-mono flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Export
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSnapshot(snap.id);
                      }}
                      className="ml-auto p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete firmware snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Snapshot Analysis Report */}
          {inspectedSnapshot && (
            <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1A2333]">
                <div>
                  <div className="text-[11px] font-mono text-cyan-400 uppercase">
                    Snapshot v{inspectedSnapshot.versionNumber} Analysis Report ·{" "}
                    {inspectedSnapshot.sourceOrigin.replace("_", " ")}
                  </div>
                  <h2 className="text-sm font-semibold text-slate-100 mt-0.5">
                    {inspectedSnapshot.label}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSnapshot?.id !== inspectedSnapshot.id) {
                      activateSnapshot(inspectedSnapshot.id);
                    }
                    setActiveSection("code_studio");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#121B2B] hover:bg-[#19253B] border border-[#24324A] text-xs font-mono text-cyan-300"
                >
                  Open in Code Studio →
                </button>
              </div>

              {inspectedSnapshot.analysisReport && (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0E1522] border border-[#1B263B] rounded-xl p-3">
                    {inspectedSnapshot.analysisReport.summary}
                  </p>

                  {/* AST Classification Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Parsed AST Nodes</div>
                      <div className="text-lg font-mono font-semibold text-emerald-400">
                        {inspectedSnapshot.analysisReport.classification.successfullyParsedNodes}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Unsupported Nodes</div>
                      <div className="text-lg font-mono font-semibold text-amber-400">
                        {inspectedSnapshot.analysisReport.classification.recognizedUnsupportedNodes}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Syntax Errors</div>
                      <div className="text-lg font-mono font-semibold text-rose-400">
                        {inspectedSnapshot.analysisReport.classification.invalidSyntaxNodes}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Est. Static RAM</div>
                      <div className="text-lg font-mono font-semibold text-cyan-300">
                        {inspectedSnapshot.analysisReport.estimatedRamBytes} B
                      </div>
                    </div>
                  </div>

                  {/* Files & Structural Inventory */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#1A2333] bg-[#0D1320] p-3 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 uppercase">
                        Source Files ({inspectedSnapshot.files.length})
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {inspectedSnapshot.files.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between text-xs font-mono text-slate-300 py-1 border-b border-[#151F30] last:border-0"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              {f.path}
                            </span>
                            <span className="text-[10px] text-slate-500">{f.sizeBytes} B</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#1A2333] bg-[#0D1320] p-3 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 uppercase">
                        Functions &amp; Hardware Dependencies
                      </div>
                      <div className="text-xs font-mono text-slate-300 space-y-1">
                        <div>
                          Entry points:{" "}
                          <span className={inspectedSnapshot.analysisReport.hasSetup ? "text-emerald-400" : "text-rose-400"}>
                            setup() {inspectedSnapshot.analysisReport.hasSetup ? "✓" : "✗"}
                          </span>{" "}
                          ·{" "}
                          <span className={inspectedSnapshot.analysisReport.hasLoop ? "text-emerald-400" : "text-rose-400"}>
                            loop() {inspectedSnapshot.analysisReport.hasLoop ? "✓" : "✗"}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Functions: {inspectedSnapshot.analysisReport.functions.length} · Enums:{" "}
                          {inspectedSnapshot.analysisReport.enums.length} · Structs/Classes:{" "}
                          {inspectedSnapshot.analysisReport.classesAndStructs.length} · Globals:{" "}
                          {inspectedSnapshot.analysisReport.variables.length}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {inspectedSnapshot.analysisReport.libraries.map((lib, idx) => (
                            <span
                              key={`${lib.name}_${idx}`}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                lib.resolved
                                  ? "bg-slate-800/80 border-slate-700 text-slate-300"
                                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                              }`}
                            >
                              {lib.isLocal ? `"${lib.name}"` : `<${lib.name}>`}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500">
                    * {inspectedSnapshot.analysisReport.memoryEstimationNote}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
