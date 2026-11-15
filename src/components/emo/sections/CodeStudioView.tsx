"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileCode2,
  FilePlus2,
  FolderOpen,
  Info,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";
import { CppCodeEditor, type CppCodeEditorHandle } from "../CppCodeEditor";

function formatCppSource(code: string, tabSize = 2): string {
  const indentUnit = " ".repeat(tabSize);
  let level = 0;
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    if (trimmed.startsWith("#")) {
      out.push(trimmed);
      continue;
    }
    let lineLevel = level;
    if (trimmed.startsWith("}") || trimmed.startsWith("case ") || trimmed.startsWith("default:")) {
      lineLevel = Math.max(0, level - 1);
    }
    out.push(indentUnit.repeat(lineLevel) + trimmed);
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    level = Math.max(0, level + opens - closes);
  }
  return out.join("\n");
}

export function CodeStudioView() {
  const {
    workingFiles,
    setWorkingFiles,
    activeFilePath,
    setActiveFilePath,
    activeSnapshot,
    hasUnsavedChanges,
    currentAnalysis,
    settings,
    updateSettings,
    importSnapshot,
    setImportModalOpen,
    analyseNow,
    jumpTarget,
    showToast,
  } = useSimulator();

  const editorRef = useRef<CppCodeEditorHandle | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("src/helper.h");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [snapshotSaveOpen, setSnapshotSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  const effectiveActivePath = useMemo(() => {
    if (activeFilePath && workingFiles.some((f) => f.path === activeFilePath)) {
      return activeFilePath;
    }
    return workingFiles[0]?.path ?? null;
  }, [activeFilePath, workingFiles]);

  const activeFile = useMemo(
    () => workingFiles.find((f) => f.path === effectiveActivePath) ?? null,
    [workingFiles, effectiveActivePath]
  );

  const visibleTabs = useMemo(() => {
    const valid = openTabs.filter((p) => workingFiles.some((f) => f.path === p));
    if (effectiveActivePath && !valid.includes(effectiveActivePath)) {
      return [...valid, effectiveActivePath];
    }
    if (valid.length === 0 && workingFiles.length > 0) {
      return [workingFiles[0].path];
    }
    return valid;
  }, [openTabs, workingFiles, effectiveActivePath]);

  const openFile = (path: string) => {
    setActiveFilePath(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  const closeTab = (path: string) => {
    const next = visibleTabs.filter((p) => p !== path);
    setOpenTabs(next);
    if (effectiveActivePath === path) {
      setActiveFilePath(next[0] ?? null);
    }
  };

  const updateActiveContent = (nextContent: string) => {
    if (!activeFile) return;
    setWorkingFiles((prev) =>
      prev.map((f) =>
        f.path === activeFile.path
          ? { ...f, content: nextContent, sizeBytes: new Blob([nextContent]).size }
          : f
      )
    );
  };

  const handleCreateFile = () => {
    const clean = newFileName.trim().replace(/^\/+/, "");
    if (!clean) return;
    if (workingFiles.some((f) => f.path === clean)) {
      showToast("warn", `File "${clean}" already exists.`);
      return;
    }
    const name = clean.split("/").pop() || clean;
    const dot = name.lastIndexOf(".");
    const extension = dot >= 0 ? name.slice(dot).toLowerCase() : ".ino";
    const file = {
      id: `local_${Date.now()}`,
      path: clean,
      name,
      extension,
      content: "",
      sizeBytes: 0,
    };
    setWorkingFiles((prev) => [...prev, file]);
    openFile(clean);
    setNewFileOpen(false);
    setNewFileName("src/module.h");
  };

  const handleRenameFile = (oldPath: string) => {
    const clean = renameValue.trim().replace(/^\/+/, "");
    if (!clean || clean === oldPath) {
      setRenamingPath(null);
      return;
    }
    const name = clean.split("/").pop() || clean;
    const dot = name.lastIndexOf(".");
    const extension = dot >= 0 ? name.slice(dot).toLowerCase() : ".ino";
    setWorkingFiles((prev) =>
      prev.map((f) => (f.path === oldPath ? { ...f, path: clean, name, extension } : f))
    );
    setOpenTabs((prev) => prev.map((p) => (p === oldPath ? clean : p)));
    if (activeFilePath === oldPath) setActiveFilePath(clean);
    setRenamingPath(null);
  };

  const handleDeleteFile = (path: string) => {
    setWorkingFiles((prev) => prev.filter((f) => f.path !== path));
    closeTab(path);
  };

  const handleRevertToSnapshot = () => {
    if (!activeSnapshot) return;
    setWorkingFiles(activeSnapshot.files);
    setActiveFilePath(activeSnapshot.files[0]?.path ?? null);
    showToast("info", `Reverted working edits back to immutable snapshot ${activeSnapshot.label}.`);
  };

  const handleSaveAsSnapshot = async () => {
    if (workingFiles.length === 0) return;
    await importSnapshot({
      files: workingFiles.map((f) => ({ path: f.path, name: f.name, content: f.content })),
      label: saveLabel.trim() || undefined,
      sourceOrigin: "editor_save",
      notes: "Saved edited firmware snapshot from Code Studio",
    });
    setSaveLabel("");
    setSnapshotSaveOpen(false);
  };

  const handleExportActiveFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileDiagnostics = useMemo(() => {
    if (!currentAnalysis || !activeFile) return [];
    return currentAnalysis.diagnostics.filter(
      (d) => d.file === activeFile.path || d.file === activeFile.name
    );
  }, [currentAnalysis, activeFile]);

  const allDiagnostics = currentAnalysis?.diagnostics ?? [];

  // Group files by folder
  const groupedFolders = useMemo(() => {
    const groups = new Map<string, typeof workingFiles>();
    for (const f of workingFiles) {
      const idx = f.path.lastIndexOf("/");
      const folder = idx >= 0 ? f.path.slice(0, idx) : "(root)";
      const list = groups.get(folder) ?? [];
      list.push(f);
      groups.set(folder, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workingFiles]);

  if (workingFiles.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-8 flex flex-col items-center justify-center text-center min-h-[520px]">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
          <FileCode2 className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Code Studio — Empty Workspace</h2>
        <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
          Import your Arduino/ESP32 firmware files (.ino, .cpp, .h, .hpp) or create a new source file
          to inspect, edit, and analyse with syntax highlighting and live AST diagnostics.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Upload className="w-4 h-4" />
            IMPORT CODE
          </button>
          <button
            type="button"
            onClick={() => {
              const blank = {
                id: `local_${Date.now()}`,
                path: "sketch.ino",
                name: "sketch.ino",
                extension: ".ino",
                content: "",
                sizeBytes: 0,
              };
              setWorkingFiles([blank]);
              setActiveFilePath("sketch.ino");
            }}
            className="px-4 py-2 rounded-lg bg-[#121926] hover:bg-[#192336] border border-[#24324A] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <FilePlus2 className="w-4 h-4 text-cyan-400" />
            New Blank File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[240px_1fr] gap-3 min-h-[calc(100dvh-9rem)]">
      {/* Left File Explorer */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1A2333]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Firmware Explorer
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNewFileOpen((v) => !v)}
              title="New Source File"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              title="Import Files"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {newFileOpen && (
          <div className="p-2.5 border-b border-[#1A2333] bg-[#0F1521] flex items-center gap-1.5">
            <input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="src/file.h"
              className="flex-1 min-w-0 px-2 py-1 rounded bg-[#070B12] border border-[#24324A] text-xs font-mono text-slate-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
              }}
            />
            <button
              type="button"
              onClick={handleCreateFile}
              className="p-1 rounded bg-cyan-500 text-slate-950"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Snapshot vs Unsaved Indicator */}
        <div className="px-3 py-2 border-b border-[#1A2333] bg-[#0D1320] text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-slate-400 truncate">
              {activeSnapshot ? `v${activeSnapshot.versionNumber}` : "Draft"}
            </span>
            {hasUnsavedChanges ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[10px]">
                UNSAVED EDITS
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">
                SNAPSHOT SYNCED
              </span>
            )}
          </div>
          {hasUnsavedChanges && (
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSnapshotSaveOpen(true)}
                className="flex-1 py-1 px-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-mono text-[10px] flex items-center justify-center gap-1"
              >
                <Save className="w-3 h-3" /> Save Snapshot
              </button>
              {activeSnapshot && (
                <button
                  type="button"
                  onClick={handleRevertToSnapshot}
                  title="Discard unsaved edits"
                  className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {groupedFolders.map(([folder, files]) => (
            <div key={folder} className="space-y-0.5">
              <div className="flex items-center gap-1.5 px-1.5 py-1 text-[10px] font-mono uppercase text-slate-500">
                <FolderOpen className="w-3 h-3 text-slate-600" />
                {folder}
              </div>
              {files.map((f) => {
                const isSelected = f.path === effectiveActivePath;
                const errCount = allDiagnostics.filter(
                  (d) => (d.file === f.path || d.file === f.name) && d.severity === "error"
                ).length;
                return (
                  <div
                    key={f.path}
                    className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-slate-800/60 border border-transparent"
                    }`}
                    onClick={() => openFile(f.path)}
                  >
                    {renamingPath === f.path ? (
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameFile(f.path)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFile(f.path);
                          if (e.key === "Escape") setRenamingPath(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="flex-1 min-w-0 px-1.5 py-0.5 rounded bg-[#070B12] border border-cyan-400 font-mono text-[11px]"
                      />
                    ) : (
                      <span
                        className="font-mono text-[11px] truncate flex items-center gap-1.5"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingPath(f.path);
                          setRenameValue(f.path);
                        }}
                      >
                        <FileCode2 className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
                        {f.name}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {errCount > 0 && (
                        <span className="px-1 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                          {errCount}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(f.path);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition"
                        title="Remove file from working set"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right Editor + Diagnostics Pane */}
      <div className="flex flex-col rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden min-h-[540px]">
        {/* Tabs & Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#1A2333] bg-[#0D1320]">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full">
            {visibleTabs.map((path) => {
              const name = path.split("/").pop() || path;
              const isAct = path === effectiveActivePath;
              return (
                <div
                  key={path}
                  onClick={() => setActiveFilePath(path)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition shrink-0 ${
                    isAct
                      ? "bg-[#141E30] text-cyan-300 border border-cyan-500/35"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <span>{name}</span>
                  {visibleTabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(path);
                      }}
                      className="text-slate-500 hover:text-slate-200"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => editorRef.current?.undo()}
              title="Undo"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editorRef.current?.redo()}
              title="Redo"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editorRef.current?.openSearch()}
              title="Search & Replace (Ctrl/Cmd+F)"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeFile) {
                  updateActiveContent(formatCppSource(activeFile.content, settings.editorTabSize));
                  showToast("info", `Formatted ${activeFile.name}`);
                }
              }}
              title="Format C++ Code"
              className="px-2 py-1 rounded-md text-[11px] font-mono text-slate-300 hover:bg-slate-800 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" /> Format
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeFile) {
                  navigator.clipboard?.writeText(activeFile.content);
                  showToast("success", "Copied file source to clipboard.");
                }
              }}
              title="Copy File"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportActiveFile}
              title="Export File"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <select
              aria-label="Editor Theme"
              value={settings.editorTheme}
              onChange={(e) =>
                updateSettings({
                  editorTheme: e.target.value as "oled-dark" | "one-dark" | "high-contrast",
                })
              }
              className="px-2 py-1 rounded bg-[#080C14] border border-[#1E293B] text-[11px] font-mono text-slate-300"
            >
              <option value="oled-dark">OLED Dark</option>
              <option value="one-dark">One Dark</option>
              <option value="high-contrast">High Contrast</option>
            </select>
            <select
              aria-label="Font Size"
              value={settings.editorFontSize}
              onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
              className="px-2 py-1 rounded bg-[#080C14] border border-[#1E293B] text-[11px] font-mono text-slate-300"
            >
              {[11, 12, 13, 14, 15, 16, 18].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}px
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={analyseNow}
              className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono transition"
            >
              Re-Analyse
            </button>
          </div>
        </div>

        {/* Save New Snapshot Inline Bar */}
        {snapshotSaveOpen && (
          <div className="px-3.5 py-2.5 border-b border-cyan-500/30 bg-cyan-500/10 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-cyan-200">Create new immutable snapshot:</span>
            <input
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="Version label (e.g. v2 — Refined Touch Debounce)"
              className="flex-1 min-w-[200px] px-2.5 py-1 rounded bg-[#070B12] border border-cyan-500/40 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={handleSaveAsSnapshot}
              className="px-3 py-1 rounded bg-cyan-500 text-slate-950 font-semibold text-xs"
            >
              Save Version
            </button>
            <button
              type="button"
              onClick={() => setSnapshotSaveOpen(false)}
              className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        {/* CodeMirror 6 Canvas */}
        <div className="flex-1 min-h-[340px] max-h-[58vh] overflow-hidden">
          {activeFile && (
            <CppCodeEditor
              ref={editorRef}
              value={activeFile.content}
              onChange={updateActiveContent}
              diagnostics={fileDiagnostics}
              fontSize={settings.editorFontSize}
              themeMode={settings.editorTheme}
              jumpLine={
                jumpTarget &&
                (jumpTarget.file === activeFile.path || jumpTarget.file === activeFile.name)
                  ? { line: jumpTarget.line, seq: jumpTarget.seq }
                  : null
              }
            />
          )}
        </div>

        {/* Bottom Diagnostics Strip */}
        <div className="border-t border-[#1A2333] bg-[#0A0E17] max-h-44 overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between px-3.5 py-1.5 border-b border-[#161F30] bg-[#0D1320] text-[11px] font-mono text-slate-400">
            <span>
              DIAGNOSTICS ({allDiagnostics.length}) —{" "}
              <span className="text-rose-400">
                {allDiagnostics.filter((d) => d.severity === "error").length} errors
              </span>{" "}
              ·{" "}
              <span className="text-amber-400">
                {allDiagnostics.filter((d) => d.severity === "warning").length} warnings
              </span>
            </span>
            <span className="text-slate-500">Click any item to jump to line</span>
          </div>
          {allDiagnostics.length === 0 ? (
            <div className="px-3.5 py-3 text-xs font-mono text-emerald-400/90">
              ✓ No syntax or missing-dependency diagnostics detected in current files.
            </div>
          ) : (
            <div className="divide-y divide-[#141D2D]">
              {allDiagnostics.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    const matchFile = workingFiles.find(
                      (f) => f.path === d.file || f.name === d.file
                    );
                    if (matchFile) openFile(matchFile.path);
                    setTimeout(() => editorRef.current?.scrollToLine(d.line), 30);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-800/40 flex items-start gap-2.5 text-xs transition"
                >
                  {d.severity === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  ) : d.severity === "warning" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-cyan-300">
                        {d.file}:{d.line}:{d.column}
                      </span>
                      <span className="uppercase text-[10px] px-1.5 rounded bg-slate-800 text-slate-400">
                        {d.category}
                      </span>
                    </div>
                    <div className="text-slate-200 mt-0.5">{d.message}</div>
                    {d.suggestion && (
                      <div className="text-[11px] text-slate-400 mt-0.5">→ {d.suggestion}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
