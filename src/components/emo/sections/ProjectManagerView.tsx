"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FolderKanban,
  GitCompare,
  Plus,
  Trash2,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";

export function ProjectManagerView() {
  const {
    projects,
    activeProject,
    snapshots,
    selectProject,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
    showToast,
  } = useSimulator();

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [capLeftId, setCapLeftId] = useState<string>("");
  const [capRightId, setCapRightId] = useState<string>("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createProject(newName.trim(), newDesc.trim());
    setNewName("");
    setNewDesc("");
  };

  const handleExportProject = () => {
    if (!activeProject) return;
    const bundle = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      project: activeProject,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.emo-project.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", `Exported project "${activeProject.name}" with all ${snapshots.length} snapshots.`);
  };

  const leftSnap = snapshots.find((s) => s.id === capLeftId) ?? snapshots[1] ?? null;
  const rightSnap = snapshots.find((s) => s.id === capRightId) ?? snapshots[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Header + Create Form */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-400" />
              Project &amp; Workspace Manager
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Organise multiple robot firmware projects with preserved snapshots, separate simulator modules, and full JSON export.
            </p>
          </div>
          {activeProject && (
            <button
              type="button"
              onClick={handleExportProject}
              className="px-3.5 py-2 rounded-lg bg-[#121A2A] hover:bg-[#19243A] border border-[#24324A] text-xs font-mono text-cyan-300 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Active Project
            </button>
          )}
        </div>

        <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#1A2333]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name (e.g. EMO v2 OLED Games)"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#070B12] border border-[#223048] text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Optional description"
            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-[#070B12] border border-[#223048] text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Project
          </button>
        </form>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map((p) => {
          const isCurrent = activeProject?.id === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition ${
                isCurrent
                  ? "border-cyan-500/50 bg-[#0F1726]"
                  : "border-[#1A2333] bg-[#0B0F17] hover:border-[#293852]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editName.trim()) {
                            renameProject(p.id, editName.trim());
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 rounded bg-[#070B12] border border-cyan-400 text-xs text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editName.trim()) renameProject(p.id, editName.trim());
                          setEditingId(null);
                        }}
                        className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-[11px] font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-sm font-semibold text-slate-100 truncate">{p.name}</h2>
                  )}

                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> OPEN
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {p.description || "Virtual EMO ESP32 robotics project."}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-mono text-slate-500">
                  <span>{p.boardType}</span>
                  <span>· {p.snapshotCount ?? 0} snapshot(s)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1A2333] flex flex-wrap items-center gap-1.5">
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => selectProject(p.id)}
                    className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-[11px] font-mono"
                  >
                    Open Workspace
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(p.id);
                    setEditName(p.name);
                  }}
                  className="px-2 py-1 rounded-md bg-[#121A2A] hover:bg-[#19243A] border border-[#1E2A40] text-slate-300 text-[11px] font-mono flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Rename
                </button>
                <button
                  type="button"
                  onClick={() => duplicateProject(p.id)}
                  className="px-2 py-1 rounded-md bg-[#121A2A] hover:bg-[#19243A] border border-[#1E2A40] text-slate-300 text-[11px] font-mono flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteProject(p.id)}
                    className="ml-auto p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Capability Report Version Comparison */}
      {snapshots.length >= 2 && leftSnap && rightSnap && (
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              Compare Capability Reports Across Firmware Versions
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <select
                value={leftSnap.id}
                onChange={(e) => setCapLeftId(e.target.value)}
                className="px-2 py-1 rounded bg-[#070B12] border border-[#223048] text-slate-200"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    v{s.versionNumber} — {s.label}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">vs</span>
              <select
                value={rightSnap.id}
                onChange={(e) => setCapRightId(e.target.value)}
                className="px-2 py-1 rounded bg-[#070B12] border border-[#223048] text-slate-200"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    v{s.versionNumber} — {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1A2333] text-[10px] text-slate-500 uppercase">
                  <th className="py-2 pr-3">Feature</th>
                  <th className="py-2 px-3">v{leftSnap.versionNumber}</th>
                  <th className="py-2 px-3">v{rightSnap.versionNumber}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141D2D]">
                {(rightSnap.capabilityReport ?? [])
                  .filter((r) => {
                    const l = leftSnap.capabilityReport?.find((x) => x.moduleId === r.moduleId);
                    return r.detected || l?.detected;
                  })
                  .map((r) => {
                    const l = leftSnap.capabilityReport?.find((x) => x.moduleId === r.moduleId);
                    const changed =
                      l?.detected !== r.detected || l?.simulatorSupport !== r.simulatorSupport;
                    return (
                      <tr key={r.moduleId} className={changed ? "bg-cyan-500/[0.06]" : ""}>
                        <td className="py-2 pr-3 text-slate-200">{r.featureName}</td>
                        <td className="py-2 px-3 text-slate-400">
                          {l?.detected ? l.simulatorSupport : "NOT DETECTED"}
                        </td>
                        <td className="py-2 px-3 text-cyan-300">
                          {r.detected ? r.simulatorSupport : "NOT DETECTED"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
