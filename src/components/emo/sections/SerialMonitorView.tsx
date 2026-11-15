"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  Search,
  Send,
  Terminal,
  Trash2,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";

export function SerialMonitorView() {
  const {
    serialLogs,
    sendSerialInput,
    clearSerialLogs,
    settings,
    updateSettings,
  } = useSimulator();

  const [paused, setPaused] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "rx" | "tx" | "warn" | "error">("all");
  const [inputText, setInputText] = useState("");
  const [frozenLogs, setFrozenLogs] = useState(serialLogs);
  const endRef = useRef<HTMLDivElement | null>(null);

  const displayedSource = paused ? frozenLogs : serialLogs;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return displayedSource.filter((log) => {
      if (filterType !== "all" && log.direction !== filterType) return false;
      if (q && !log.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [displayedSource, filterType, searchQuery]);

  useEffect(() => {
    if (!paused) {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [filtered.length, paused]);

  const handleTogglePause = () => {
    if (!paused) {
      setFrozenLogs(serialLogs);
      setPaused(true);
    } else {
      setPaused(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendSerialInput(inputText);
    setInputText("");
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#1A2333] bg-[#0B0F17] overflow-hidden min-h-[calc(100dvh-9rem)]">
      {/* Toolbar */}
      <div className="p-3.5 border-b border-[#1A2333] bg-[#0D1320] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h1 className="text-sm font-semibold text-slate-100">Serial Monitor</h1>
          <span className="text-[11px] font-mono text-slate-500">
            ({filtered.length} lines)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-8 pr-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] text-xs font-mono text-slate-200 w-36 sm:w-44 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "all" | "rx" | "tx" | "warn" | "error")
            }
            className="px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] text-xs font-mono text-slate-300"
          >
            <option value="all">All</option>
            <option value="rx">RX (Firmware)</option>
            <option value="tx">TX (Input)</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
          </select>

          {/* Baud Rate */}
          <select
            aria-label="Baud Rate"
            value={settings.defaultBaudRate}
            onChange={(e) => updateSettings({ defaultBaudRate: Number(e.target.value) })}
            className="px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] text-xs font-mono text-cyan-300"
          >
            {[9600, 19200, 38400, 57600, 115200, 230400, 921600].map((b) => (
              <option key={b} value={b}>
                {b} baud
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer px-1">
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(e) => setShowTimestamps(e.target.checked)}
              className="accent-cyan-400"
            />
            Timestamps
          </label>

          <button
            type="button"
            onClick={handleTogglePause}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border flex items-center gap-1 transition ${
              paused
                ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                : "bg-[#121A2A] border-[#223048] text-slate-300 hover:text-white"
            }`}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            type="button"
            onClick={() => {
              clearSerialLogs();
              setFrozenLogs([]);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#121A2A] hover:bg-rose-500/15 border border-[#223048] hover:border-rose-500/40 text-slate-300 hover:text-rose-200 text-xs font-mono flex items-center gap-1 transition"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Log Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 font-mono text-xs bg-[#06090F] space-y-1">
        {filtered.length === 0 ? (
          <div className="text-slate-500 py-8 text-center">
            No Serial UART output yet. Run imported firmware that calls Serial.begin() / Serial.println().
          </div>
        ) : (
          filtered.map((entry) => {
            const colorClass =
              entry.direction === "error"
                ? "text-rose-300 bg-rose-500/10 border-l-2 border-rose-500 px-2 py-0.5 rounded-r"
                : entry.direction === "warn"
                ? "text-amber-300 bg-amber-500/10 border-l-2 border-amber-400 px-2 py-0.5 rounded-r"
                : entry.direction === "tx"
                ? "text-cyan-300"
                : entry.direction === "system"
                ? "text-slate-500"
                : "text-slate-200";
            return (
              <div key={entry.id} className={`flex items-start gap-2.5 leading-relaxed ${colorClass}`}>
                {showTimestamps && (
                  <span className="text-[10px] text-slate-500 shrink-0 select-none pt-0.5">
                    [{entry.wallTime} · {String(entry.timestampMs).padStart(6, "0")}ms]
                  </span>
                )}
                <span className="text-[10px] uppercase text-slate-500 shrink-0 pt-0.5 w-7">
                  {entry.direction}
                </span>
                <span className="whitespace-pre-wrap break-all">{entry.text}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Serial TX Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[#1A2333] bg-[#0D1320] flex items-center gap-2"
      >
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send string to firmware Serial.read() / Serial.readString()..."
          className="flex-1 px-3 py-2 rounded-lg bg-[#070B12] border border-[#223048] text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
        >
          <Send className="w-3.5 h-3.5" />
          Send TX
        </button>
      </form>
    </div>
  );
}
