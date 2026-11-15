"use client";

import React from "react";
import {
  AlertTriangle,
  Eye,
  Gauge,
  Monitor,
  Palette,
  RotateCcw,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";
import { DEFAULT_CUSTOMIZATION, type CustomizationConfig } from "@/lib/simulator/types";

export function CustomizationView() {
  const { activeProject, updateCustomization, runtimeSnapshot, showToast } = useSimulator();
  const cust = activeProject?.customization ?? DEFAULT_CUSTOMIZATION;

  const patch = (updater: (prev: CustomizationConfig) => CustomizationConfig) => {
    updateCustomization(updater(cust));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            Robot Customization — Visual Appearance &amp; Rendering
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            All adjustments here are strictly visual/simulator-level and never modify your imported firmware source code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            updateCustomization(DEFAULT_CUSTOMIZATION);
            showToast("info", "Reset visual customization to default factory finish.");
          }}
          className="px-3 py-1.5 rounded-lg bg-[#121A2A] hover:bg-[#19243A] border border-[#24324A] text-xs font-mono text-slate-300 flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. OLED Display Appearance */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> OLED Display (128×64)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              FIRMWARE FRAMEBUFFER CONTROLLED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">
                Pixel Appearance
              </span>
              <select
                value={cust.oled.pixelStyle}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    oled: {
                      ...p.oled,
                      pixelStyle: e.target.value as CustomizationConfig["oled"]["pixelStyle"],
                    },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] font-mono text-slate-200"
              >
                <option value="grid">OLED Matrix Grid</option>
                <option value="crisp">Crisp 1:1 Pixel</option>
                <option value="glow">Phosphor Bloom</option>
                <option value="dual_zone">Dual-Zone (Yellow/Cyan)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Frame Design</span>
              <select
                value={cust.oled.frameDesign}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    oled: {
                      ...p.oled,
                      frameDesign: e.target.value as CustomizationConfig["oled"]["frameDesign"],
                    },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] font-mono text-slate-200"
              >
                <option value="emo_visor">EMO Glossy Visor</option>
                <option value="bezel_minimal">Minimal Bezel</option>
                <option value="lab_bench">Lab Bench Frame</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Phosphor Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cust.oled.phosphorColor}
                  onChange={(e) =>
                    patch((p) => ({ ...p, oled: { ...p.oled, phosphorColor: e.target.value } }))
                  }
                  className="h-8 w-10 rounded bg-transparent border border-[#223048]"
                />
                <span className="font-mono text-[11px] text-slate-300">
                  {cust.oled.phosphorColor}
                </span>
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Background Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cust.oled.backgroundColor}
                  onChange={(e) =>
                    patch((p) => ({ ...p, oled: { ...p.oled, backgroundColor: e.target.value } }))
                  }
                  className="h-8 w-10 rounded bg-transparent border border-[#223048]"
                />
                <span className="font-mono text-[11px] text-slate-300">
                  {cust.oled.backgroundColor}
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Render Scale</span>
                <span className="text-cyan-300">{cust.oled.scale}x</span>
              </div>
              <input
                type="range"
                min={2}
                max={5}
                step={0.5}
                value={cust.oled.scale}
                onChange={(e) =>
                  patch((p) => ({ ...p, oled: { ...p.oled, scale: Number(e.target.value) } }))
                }
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Brightness</span>
                <span className="text-cyan-300">{cust.oled.brightness}%</span>
              </div>
              <input
                type="range"
                min={35}
                max={135}
                value={cust.oled.brightness}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    oled: { ...p.oled, brightness: Number(e.target.value) },
                  }))
                }
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Contrast</span>
                <span className="text-cyan-300">{cust.oled.contrast}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={150}
                value={cust.oled.contrast}
                onChange={(e) =>
                  patch((p) => ({ ...p, oled: { ...p.oled, contrast: Number(e.target.value) } }))
                }
                className="w-full accent-cyan-400"
              />
            </label>
          </div>
        </div>

        {/* 2. Body, Material, Lighting & 3D Camera */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3.5">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Virtual Body, Material &amp; Lighting
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Shell Material</span>
              <select
                value={cust.body.material}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    body: {
                      ...p.body,
                      material: e.target.value as CustomizationConfig["body"]["material"],
                    },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] font-mono text-slate-200"
              >
                <option value="satin">Satin Polycarbonate</option>
                <option value="matte">Matte Stealth</option>
                <option value="metallic">Brushed Alloy</option>
                <option value="carbon">Carbon Graphite</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Proportions</span>
              <select
                value={cust.body.proportions}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    body: {
                      ...p.body,
                      proportions: e.target.value as CustomizationConfig["body"]["proportions"],
                    },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] font-mono text-slate-200"
              >
                <option value="standard">Standard EMO</option>
                <option value="compact">Compact Desktop</option>
                <option value="tall">Tall Studio</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Body Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cust.body.bodyColor}
                  onChange={(e) =>
                    patch((p) => ({ ...p, body: { ...p.body, bodyColor: e.target.value } }))
                  }
                  className="h-8 w-10 rounded bg-transparent border border-[#223048]"
                />
                <span className="font-mono text-[11px] text-slate-300">{cust.body.bodyColor}</span>
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-mono text-[11px] block">Earcup Accent</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cust.body.accentColor}
                  onChange={(e) =>
                    patch((p) => ({ ...p, body: { ...p.body, accentColor: e.target.value } }))
                  }
                  className="h-8 w-10 rounded bg-transparent border border-[#223048]"
                />
                <span className="font-mono text-[11px] text-slate-300">
                  {cust.body.accentColor}
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Lighting</span>
                <span className="text-cyan-300">{cust.body.lightingIntensity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={cust.body.lightingIntensity}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    body: { ...p.body, lightingIntensity: Number(e.target.value) },
                  }))
                }
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Shadows</span>
                <span className="text-cyan-300">{cust.body.shadowOpacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={cust.body.shadowOpacity}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    body: { ...p.body, shadowOpacity: Number(e.target.value) },
                  }))
                }
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Camera Zoom</span>
                <span className="text-cyan-300">{cust.body.zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.75}
                max={1.25}
                step={0.05}
                value={cust.body.zoom}
                onChange={(e) =>
                  patch((p) => ({ ...p, body: { ...p.body, zoom: Number(e.target.value) } }))
                }
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Screen Placement Y</span>
                <span className="text-cyan-300">{cust.body.screenOffsetY}px</span>
              </div>
              <input
                type="range"
                min={-8}
                max={8}
                value={cust.body.screenOffsetY}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    body: { ...p.body, screenOffsetY: Number(e.target.value) },
                  }))
                }
                className="w-full accent-cyan-400"
              />
            </label>
          </div>
        </div>

        {/* 3. Eyes Visual Calibration Guide (Clearly separated from firmware!) */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Eye Geometry Calibration Overlay
            </h2>
            <label className="flex items-center gap-2 text-[11px] font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={cust.eyes.visualOverrideEnabled}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    eyes: { ...p.eyes, visualOverrideEnabled: e.target.checked },
                  }))
                }
                className="accent-amber-400"
              />
              <span className={cust.eyes.visualOverrideEnabled ? "text-amber-300" : "text-slate-400"}>
                {cust.eyes.visualOverrideEnabled ? "Visual Override ON" : "Visual Override OFF"}
              </span>
            </label>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5 text-[11px] text-amber-200/90 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Visual-only overlay guide:</strong>{" "}
              {runtimeSnapshot.oledActivePixels > 0
                ? "Your imported firmware is actively controlling the OLED framebuffer. Enabling this toggle draws a non-destructive alignment wireframe guide without modifying your firmware code."
                : "Disabled by default so the virtual OLED remains strictly blank until your imported firmware draws pixels."}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
            {(
              [
                ["width", "Width", 10, 44, 1],
                ["height", "Height", 10, 44, 1],
                ["spacing", "Spacing", 4, 34, 1],
                ["size", "Scale", 0.5, 1.6, 0.1],
                ["pupilSize", "Pupil", 0, 8, 1],
                ["gazeX", "Gaze X", -8, 8, 1],
                ["gazeY", "Gaze Y", -8, 8, 1],
                ["offsetX", "Pos X", -16, 16, 1],
                ["offsetY", "Pos Y", -12, 12, 1],
              ] as const
            ).map(([key, label, min, max, step]) => (
              <label key={key} className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>{label}</span>
                  <span className="text-slate-200">{cust.eyes[key]}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={cust.eyes[key]}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      eyes: { ...p.eyes, [key]: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              Shape:
              <select
                value={cust.eyes.shape}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    eyes: {
                      ...p.eyes,
                      shape: e.target.value as CustomizationConfig["eyes"]["shape"],
                    },
                  }))
                }
                className="px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              >
                <option value="rounded">Rounded</option>
                <option value="sharp">Sharp</option>
                <option value="oval">Oval</option>
                <option value="pixel">Pixel</option>
              </select>
            </label>
            <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              Guide Color:
              <input
                type="color"
                value={cust.eyes.color}
                onChange={(e) =>
                  patch((p) => ({ ...p, eyes: { ...p.eyes, color: e.target.value } }))
                }
                className="h-6 w-8 rounded bg-transparent border border-[#223048]"
              />
            </label>
          </div>
        </div>

        {/* 4. Simulation Speed & Rendering Pipeline */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3.5">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" /> Simulation Timing &amp; Rendering
          </h2>

          <div className="space-y-3 text-xs font-mono">
            <label className="block">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Simulation Clock Speed</span>
                <span className="text-cyan-300">{cust.rendering.simulationSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={3.0}
                step={0.25}
                value={cust.rendering.simulationSpeed}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    rendering: { ...p.rendering, simulationSpeed: Number(e.target.value) },
                  }))
                }
                className="w-full accent-cyan-400"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Target Frame Rate</span>
                <select
                  value={cust.rendering.targetFps}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      rendering: { ...p.rendering, targetFps: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] text-slate-200"
                >
                  <option value={30}>30 FPS (Battery)</option>
                  <option value={60}>60 FPS (Standard)</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Render Quality</span>
                <select
                  value={cust.rendering.quality}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      rendering: {
                        ...p.rendering,
                        quality: e.target.value as CustomizationConfig["rendering"]["quality"],
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#070B12] border border-[#1E293B] text-slate-200"
                >
                  <option value="high">High (Glow + Shadows)</option>
                  <option value="balanced">Balanced</option>
                  <option value="battery">Mobile Saver</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
