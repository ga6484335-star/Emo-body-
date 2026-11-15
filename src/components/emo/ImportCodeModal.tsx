"use client";

import React, { useRef, useState } from "react";
import {
  Check,
  Code2,
  FileCode2,
  FilePlus2,
  FolderUp,
  Layers,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSimulator } from "./SimulatorProvider";

interface StagedFile {
  path: string;
  content: string;
}

const ALLOWED_EXTENSIONS = [".ino", ".cpp", ".h", ".hpp", ".txt", ".c"];

function isAllowedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function ImportCodeModal() {
  const {
    importModalOpen,
    setImportModalOpen,
    importSnapshot,
    workingFiles,
    setActiveSection,
    busyAction,
  } = useSimulator();

  const [tab, setTab] = useState<"files" | "paste">("files");
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [mergeWithCurrent, setMergeWithCurrent] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paste code tab state
  const [pasteFileName, setPasteFileName] = useState("emo_firmware.ino");
  const [pasteContent, setPasteContent] = useState("");

  // Rename state
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  if (!importModalOpen) return null;

  const addFileList = async (files: FileList | File[]) => {
    setErrorMsg(null);
    const list = Array.from(files);
    const added: StagedFile[] = [];
    const skipped: string[] = [];

    for (const file of list) {
      const relPath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      if (!isAllowedFile(relPath)) {
        skipped.push(file.name);
        continue;
      }
      const text = await file.text();
      added.push({ path: relPath.replace(/^\/+/, ""), content: text });
    }

    if (skipped.length > 0 && added.length === 0) {
      setErrorMsg(
        `Skipped unsupported file(s): ${skipped.slice(0, 4).join(", ")}. Supported extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    setStaged((prev) => {
      const map = new Map(prev.map((f) => [f.path, f]));
      for (const a of added) {
        map.set(a.path, a);
      }
      return Array.from(map.values());
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const collected: File[] = [];
      const readEntry = async (entry: FileSystemEntry, prefix = ""): Promise<void> => {
        if (entry.isFile) {
          const fEntry = entry as FileSystemFileEntry;
          await new Promise<void>((resolve) => {
            fEntry.file(
              (file) => {
                const customPath = prefix ? `${prefix}/${file.name}` : file.name;
                Object.defineProperty(file, "webkitRelativePath", {
                  value: customPath,
                  writable: false,
                });
                collected.push(file);
                resolve();
              },
              () => resolve()
            );
          });
        } else if (entry.isDirectory) {
          const dEntry = entry as FileSystemDirectoryEntry;
          const reader = dEntry.createReader();
          await new Promise<void>((resolve) => {
            reader.readEntries(
              async (entries) => {
                for (const child of entries) {
                  await readEntry(child, prefix ? `${prefix}/${entry.name}` : entry.name);
                }
                resolve();
              },
              () => resolve()
            );
          });
        }
      };

      let usedEntries = false;
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          usedEntries = true;
          await readEntry(entry);
        }
      }
      if (usedEntries) {
        await addFileList(collected);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFileList(e.dataTransfer.files);
    }
  };

  const handleStagePasted = () => {
    setErrorMsg(null);
    const cleanName = pasteFileName.trim();
    if (!cleanName) {
      setErrorMsg("Enter a file name (e.g. main.ino or faces.h).");
      return;
    }
    if (!pasteContent.trim()) {
      setErrorMsg("Paste your Arduino/C++ firmware source code first.");
      return;
    }
    setStaged((prev) => {
      const map = new Map(prev.map((f) => [f.path, f]));
      map.set(cleanName, { path: cleanName, content: pasteContent });
      return Array.from(map.values());
    });
    setPasteContent("");
    setTab("files");
  };

  const handleAddBlankFile = () => {
    const idx = staged.length + 1;
    const name = idx === 1 ? "firmware.ino" : `module_${idx}.h`;
    setStaged((prev) => [
      ...prev,
      {
        path: name,
        content: "",
      },
    ]);
  };

  const handleSubmitImport = async () => {
    setErrorMsg(null);
    let finalFiles: StagedFile[] = [...staged];

    // If user is on paste tab and pasted code directly without clicking "Stage File", include it!
    if (tab === "paste" && pasteContent.trim()) {
      const cleanName = pasteFileName.trim() || "firmware.ino";
      const map = new Map(finalFiles.map((f) => [f.path, f]));
      map.set(cleanName, { path: cleanName, content: pasteContent });
      finalFiles = Array.from(map.values());
    }

    if (mergeWithCurrent && workingFiles.length > 0) {
      const merged = new Map(workingFiles.map((f) => [f.path, { path: f.path, content: f.content }]));
      for (const sf of finalFiles) {
        merged.set(sf.path, sf);
      }
      finalFiles = Array.from(merged.values());
    }

    if (finalFiles.length === 0) {
      setErrorMsg("Select, drop, or paste at least one firmware source file to import.");
      return;
    }

    const origin =
      tab === "paste" && staged.length === 0
        ? "paste"
        : finalFiles.some((f) => f.path.includes("/"))
        ? "folder_import"
        : "file_import";

    const snap = await importSnapshot({
      files: finalFiles.map((f) => ({ path: f.path, content: f.content })),
      label: snapshotLabel.trim() || undefined,
      sourceOrigin: origin,
      notes: snapshotNotes.trim(),
    });

    if (snap) {
      setStaged([]);
      setPasteContent("");
      setSnapshotLabel("");
      setSnapshotNotes("");
      setImportModalOpen(false);
      // Direct user to Capability Center or stay on current section so they immediately inspect the automatic analysis!
      setActiveSection("capability_center");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-2xl border border-[#223048] bg-[#0A0E17] shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A2333] bg-[#0D1320]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
                IMPORT CODE — Firmware Snapshot Loader
              </h2>
              <p className="text-[11px] text-slate-400">
                100% local AST analysis — no external AI key required. Every import creates a versioned snapshot.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close Import Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-[#1A2333] bg-[#0A0E17]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("files")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                tab === "files"
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              Files &amp; Folders ({staged.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("paste")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                tab === "paste"
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Paste Source Code
            </button>
          </div>

          {workingFiles.length > 0 && (
            <label className="flex items-center gap-2 text-[11px] text-slate-300 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mergeWithCurrent}
                onChange={(e) => setMergeWithCurrent(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 accent-cyan-400"
              />
              Merge with current {workingFiles.length} file(s)
            </label>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {tab === "files" ? (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-[#223048] bg-[#0D1320]/70 hover:border-cyan-500/40"
                }`}
              >
                <div className="mx-auto w-11 h-11 rounded-xl bg-[#131C2E] border border-[#25334D] flex items-center justify-center text-cyan-400 mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Drag &amp; drop firmware files or project folders here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: <span className="font-mono text-slate-300">.ino .cpp .h .hpp .txt</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    Select Files (.ino, .cpp, .h)
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-lg bg-[#131B2A] hover:bg-[#192438] border border-[#25334D] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-sky-400" />
                    Select Firmware Folder
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBlankFile}
                    className="px-3 py-2 rounded-lg bg-[#131B2A] hover:bg-[#192438] border border-[#25334D] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Add Empty File
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".ino,.cpp,.h,.hpp,.txt,.c"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFileList(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  // @ts-expect-error webkitdirectory is supported in Chromium/Safari/Firefox
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFileList(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Staged Files List */}
              {staged.length > 0 && (
                <div className="rounded-xl border border-[#1A2333] bg-[#0D1320] overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#1A2333] text-[11px] font-mono text-slate-400">
                    <span>STAGED FILES ({staged.length})</span>
                    <button
                      type="button"
                      onClick={() => setStaged([])}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="divide-y divide-[#151E2E] max-h-48 overflow-y-auto">
                    {staged.map((f, idx) => (
                      <div
                        key={`${f.path}_${idx}`}
                        className="flex items-center justify-between gap-2 px-3.5 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          {renamingIdx === idx ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                className="flex-1 px-2 py-0.5 rounded bg-[#070B12] border border-cyan-500/50 text-xs font-mono text-slate-100"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (renameDraft.trim()) {
                                    setStaged((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, path: renameDraft.trim() } : item
                                      )
                                    );
                                  }
                                  setRenamingIdx(null);
                                }}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setRenamingIdx(idx);
                                setRenameDraft(f.path);
                              }}
                              className="font-mono text-slate-200 truncate cursor-text"
                              title="Double-click to rename path"
                            >
                              {f.path}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[11px] text-slate-500">
                            {f.content.split("\n").length} lines · {f.content.length} B
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingIdx(idx);
                              setRenameDraft(f.path);
                            }}
                            className="text-[11px] text-slate-400 hover:text-cyan-300"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => setStaged((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400"
                            aria-label={`Remove ${f.path}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-mono text-slate-400">File Path:</label>
                <input
                  type="text"
                  value={pasteFileName}
                  onChange={(e) => setPasteFileName(e.target.value)}
                  placeholder="emo_firmware.ino or include/faces.h"
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleStagePasted}
                  className="px-3 py-1.5 rounded-lg bg-[#131C2E] hover:bg-[#1B2840] border border-[#25334D] text-xs text-cyan-300 font-medium transition"
                >
                  + Add to Multi-File Batch
                </button>
              </div>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={12}
                placeholder={`Paste your Arduino / ESP32 firmware code here (.ino, .cpp, .h)...\n\nExample structure:\n#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\n\nvoid setup() { ... }\nvoid loop() { ... }`}
                className="w-full rounded-xl bg-[#070B12] border border-[#223048] p-3.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 leading-relaxed resize-y"
                spellCheck={false}
              />
            </div>
          )}

          {/* Snapshot Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1A2333]">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Version Snapshot Label (Optional)
              </label>
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="e.g. EMO v1.0 — Touch & OLED Faces"
                className="w-full px-3 py-2 rounded-lg bg-[#070B12] border border-[#1E293B] text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Snapshot Notes (Optional)
              </label>
              <input
                type="text"
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                placeholder="Hardware target notes or changelog"
                className="w-full px-3 py-2 rounded-lg bg-[#070B12] border border-[#1E293B] text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-[#1A2333] bg-[#0D1320]">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Previous snapshots are preserved untouched. Automatic AST analysis runs on import.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={handleSubmitImport}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(34,211,238,0.25)]"
            >
              <Upload className="w-3.5 h-3.5" />
              {busyAction ? "Analysing..." : "Import & Auto-Analyse"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
