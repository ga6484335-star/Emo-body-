"use client";

import React from "react";
import { Cpu, ShieldAlert, Sliders, Sparkles } from "lucide-react";
import { useSimulator } from "../SimulatorProvider";

export function SettingsView() {
  const { settings, updateSettings } = useSimulator();

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4">
        <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Simulator Settings &amp; Architecture Transparency
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure editor preferences, interpreter safety limits, optional AI assistant hooks, and review honest virtual hardware boundaries.
        </p>
      </div>

      {/* Execution Safety Limits */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3.5">
        <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" /> Safe Interpreter Execution Guardrails
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <label className="space-y-1.5">
            <span className="text-slate-400 block">
              Max AST Instructions per Frame Tick ({settings.maxInstructionsPerTick.toLocaleString()})
            </span>
            <input
              type="range"
              min={2000}
              max={100000}
              step={2000}
              value={settings.maxInstructionsPerTick}
              onChange={(e) =>
                updateSettings({ maxInstructionsPerTick: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500 block">
              Prevents infinite while(1) firmware loops from hanging your browser.
            </span>
          </label>

          <label className="space-y-1.5">
            <span className="text-slate-400 block">
              Max Function Call Stack Depth ({settings.maxCallStackDepth})
            </span>
            <input
              type="range"
              min={16}
              max={128}
              step={8}
              value={settings.maxCallStackDepth}
              onChange={(e) =>
                updateSettings({ maxCallStackDepth: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500 block">
              Detects runaway recursive functions cleanly with file and line reporting.
            </span>
          </label>
        </div>
      </div>

      {/* Optional AI-Assisted Extension Provider (Strictly Optional!) */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Optional AI Extension Provider (Not Required)
          </h2>
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiExtensionAssistant.enabled}
              onChange={(e) =>
                updateSettings({
                  aiExtensionAssistant: {
                    ...settings.aiExtensionAssistant,
                    enabled: e.target.checked,
                    provider: e.target.checked ? "openai-compatible" : "none",
                  },
                })
              }
              className="accent-cyan-400"
            />
            Enable Optional Hook
          </label>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          All core features — firmware import, AST parsing, capability reporting, modular hardware simulation,
          OLED rendering, diagnostics, and built-in <span className="font-mono text-cyan-300">IMPLEMENT SUPPORT</span>{" "}
          workflows — operate 100% locally without any AI API key.
        </p>

        {settings.aiExtensionAssistant.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1A2333] text-xs font-mono">
            <label className="space-y-1">
              <span className="text-slate-400 block">OpenAI-Compatible Endpoint URL</span>
              <input
                value={settings.aiExtensionAssistant.endpointUrl}
                onChange={(e) =>
                  updateSettings({
                    aiExtensionAssistant: {
                      ...settings.aiExtensionAssistant,
                      endpointUrl: e.target.value,
                    },
                  })
                }
                placeholder="https://api.example.com/v1/chat/completions"
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 block">Model ID</span>
              <input
                value={settings.aiExtensionAssistant.model}
                onChange={(e) =>
                  updateSettings({
                    aiExtensionAssistant: {
                      ...settings.aiExtensionAssistant,
                      model: e.target.value,
                    },
                  })
                }
                placeholder="gpt-4.1-mini"
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-slate-200"
              />
            </label>
          </div>
        )}
      </div>

      {/* Honest Hardware Limitations Manifesto (Section 19) */}
      <div className="rounded-2xl border border-amber-500/30 bg-[#0D1119] p-5 space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> Honest Virtual Hardware Limitations &amp; Execution Model
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
          <div className="rounded-xl bg-[#090D15] border border-[#1A2333] p-3 space-y-1">
            <div className="font-mono text-[11px] text-cyan-300">1. Static Analysis &amp; Safe AST Interpretation</div>
            <p className="text-slate-400">
              EMO Virtual Body uses a real C++/Arduino lexer, recursive-descent AST parser, and safe generator-based subset interpreter (zero eval/Function). It does NOT run a native Xtensa GCC compiler.
            </p>
          </div>
          <div className="rounded-xl bg-[#090D15] border border-[#1A2333] p-3 space-y-1">
            <div className="font-mono text-[11px] text-cyan-300">2. Virtual Hardware vs Physical ESP32</div>
            <p className="text-slate-400">
              OLED 128×64, GPIO, capacitive/digital touch, Serial UART, I2C, Buzzer/Speaker, and Virtual NVS run in isolated browser memory — never flashing or connecting to physical ESP32 silicon.
            </p>
          </div>
          <div className="rounded-xl bg-[#090D15] border border-[#1A2333] p-3 space-y-1">
            <div className="font-mono text-[11px] text-amber-300">3. Audio &amp; Microphone Separation</div>
            <p className="text-slate-400">
              Piezo Buzzer, DAC/LEDC Speaker, and Microphone are strictly separate channels. Browser mic permissions cannot emulate ESP32 I2S DMA hardware; microphone simulation is honestly labeled PARTIAL.
            </p>
          </div>
          <div className="rounded-xl bg-[#090D15] border border-[#1A2333] p-3 space-y-1">
            <div className="font-mono text-[11px] text-rose-300">4. Wireless, Interrupts &amp; RTOS</div>
            <p className="text-slate-400">
              Wi-Fi, Bluetooth Classic/BLE GATT, hardware interrupts, and FreeRTOS dual-core scheduling are never falsely marked fully supported when physical radio or kernel hardware is absent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
