"use client";

import React, { useRef, useState } from "react";
import {
  Activity,
  Cpu,
  Download,
  Eye,
  Hand,
  Play,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";
import { OledCanvas } from "../OledCanvas";
import { DEFAULT_CUSTOMIZATION, DEFAULT_HARDWARE_CONFIG } from "@/lib/simulator/types";

export function RobotStudioView() {
  const {
    activeProject,
    activeSnapshot,
    workingFiles,
    currentAnalysis,
    currentCapabilities,
    runtimeRef,
    runtimeSnapshot,
    oledVersion,
    setImportModalOpen,
    setActiveSection,
    runNow,
    updateCustomization,
    setTouchPressed,
    triggerTouchGesture,
  } = useSimulator();

  const hw = activeProject?.hardwareConfig ?? DEFAULT_HARDWARE_CONFIG;
  const cust = activeProject?.customization ?? DEFAULT_CUSTOMIZATION;

  const [dragOrbit, setDragOrbit] = useState<{
    rotX: number;
    rotY: number;
  } | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const [headPressed, setHeadPressed] = useState(false);
  const [wakePressed, setWakePressed] = useState(false);

  const rotX = dragOrbit?.rotX ?? cust.body.rotationX;
  const rotY = dragOrbit?.rotY ?? cust.body.rotationY;

  const hasFirmware = workingFiles.length > 0;
  const litRatio = Math.min(1, runtimeSnapshot.oledActivePixels / 1800);
  const phosphorColor = cust.oled.phosphorColor || "#22D3EE";

  const mainPinState = runtimeSnapshot.pins[hw.touch.mainTouchPin];
  const wakePinState = runtimeSnapshot.pins[hw.touch.wakeTouchPin];
  const ledPinState = runtimeSnapshot.pins[2];

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      baseX: rotX,
      baseY: rotY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setDragOrbit({
      rotX: Math.max(-28, Math.min(28, dragStartRef.current.baseX - dy * 0.25)),
      rotY: Math.max(-40, Math.min(40, dragStartRef.current.baseY + dx * 0.3)),
    });
  };

  const handleStagePointerUp = () => {
    if (dragStartRef.current && dragOrbit) {
      updateCustomization({
        ...cust,
        body: {
          ...cust.body,
          rotationX: Math.round(dragOrbit.rotX),
          rotationY: Math.round(dragOrbit.rotY),
        },
      });
    }
    dragStartRef.current = null;
  };

  const setCameraPreset = (preset: "front" | "hero_3q" | "top_down" | "desk_low") => {
    const map = {
      front: { rotationX: 0, rotationY: 0, zoom: 1.0 },
      hero_3q: { rotationX: 6, rotationY: -12, zoom: 1.0 },
      top_down: { rotationX: 22, rotationY: -8, zoom: 0.96 },
      desk_low: { rotationX: -12, rotationY: 10, zoom: 1.04 },
    };
    const next = map[preset];
    setDragOrbit(null);
    updateCustomization({
      ...cust,
      body: {
        ...cust.body,
        cameraAngle: preset,
        ...next,
      },
    });
  };

  // Surface material styles
  const bodySurfaceClass =
    cust.body.material === "metallic"
      ? "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950"
      : cust.body.material === "carbon"
      ? "bg-gradient-to-b from-[#171c26] to-[#0b0e14]"
      : cust.body.material === "matte"
      ? "bg-[#151a24]"
      : "bg-gradient-to-b from-[#1e2636] via-[#131924] to-[#0c1018]";

  const proportionScale =
    cust.body.proportions === "compact"
      ? "scale-[0.94]"
      : cust.body.proportions === "tall"
      ? "scale-y-[1.06]"
      : "";

  const unsupportedDetected = currentCapabilities.filter(
    (c) => c.detected && c.simulatorSupport === "UNSUPPORTED"
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px] gap-4 h-full min-h-[calc(100dvh-9rem)]">
      {/* Main Interactive 3D Robot Studio Stage */}
      <div className="relative flex flex-col rounded-2xl border border-[#1A2333] bg-[#090D15] bg-studio-grid overflow-hidden min-h-[470px]">
        {/* Stage Top HUD */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#1A2333]/80 bg-[#0B0F17]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                runtimeSnapshot.state === "RUNNING"
                  ? "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                  : runtimeSnapshot.state === "PAUSED"
                  ? "bg-amber-400"
                  : runtimeSnapshot.state === "ERROR"
                  ? "bg-rose-500"
                  : "bg-slate-600"
              }`}
            />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
              {hw.boardType} · SSD1306 128×64 ({hw.oled.i2cAddress})
            </span>
            {cust.eyes.visualOverrideEnabled && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                VISUAL OVERLAY ACTIVE (NON-FIRMWARE)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                ["front", "Front"],
                ["hero_3q", "3/4"],
                ["top_down", "Top"],
                ["desk_low", "Low"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCameraPreset(key)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition ${
                  cust.body.cameraAngle === key
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCameraPreset("front")}
              title="Reset Orbit Angle"
              className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive 3D Virtual EMO Robot Viewport */}
        <div
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          onPointerCancel={handleStagePointerUp}
          className="relative flex-1 flex flex-col items-center justify-center p-6 select-none cursor-grab active:cursor-grabbing overflow-hidden"
          style={{ perspective: "1100px" }}
        >
          {/* Studio overhead key light */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[240px] rounded-full blur-3xl transition-opacity duration-300"
            style={{
              background: `radial-gradient(ellipse, rgba(148,163,184,${
                (cust.body.lightingIntensity / 100) * 0.14
              }), transparent 72%)`,
            }}
          />

          {/* Dynamic OLED bounce glow onto desk — STRICTLY ZERO when OLED is blank! */}
          <div
            className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 w-[320px] h-[90px] rounded-full blur-3xl transition-all duration-150"
            style={{
              background: phosphorColor,
              opacity: litRatio * 0.24,
            }}
          />

          {/* 3D Rotatable EMO Chassis Container */}
          <div
            className={`relative transition-transform duration-100 ease-out ${proportionScale}`}
            style={{
              transform: `scale(${cust.body.zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Headphone Arch Band */}
            <div className="relative mx-auto w-[270px] sm:w-[320px] flex flex-col items-center">
              <div
                className="w-[238px] sm:w-[280px] h-[26px] rounded-t-[140px] border-t-[10px] border-x-[10px] border-slate-700/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12)] -mb-3 relative z-0"
                style={{
                  borderColor: cust.body.bodyColor !== "#141923" ? cust.body.bodyColor : undefined,
                }}
              />

              {/* Direct Interactive Head Main Touch Sensor Pad (GPIO27) */}
              <button
                type="button"
                onPointerDown={() => {
                  setHeadPressed(true);
                  setTouchPressed("MAIN_TOUCH", true);
                }}
                onPointerUp={() => {
                  setHeadPressed(false);
                  setTouchPressed("MAIN_TOUCH", false);
                }}
                onPointerLeave={() => {
                  if (headPressed) {
                    setHeadPressed(false);
                    setTouchPressed("MAIN_TOUCH", false);
                  }
                }}
                className={`relative z-20 -mb-2 px-5 py-1.5 rounded-t-xl border text-[10px] font-mono tracking-wider uppercase flex items-center gap-1.5 transition-all ${
                  headPressed
                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.45)] translate-y-[1px]"
                    : "bg-[#121826] border-[#263248] text-slate-400 hover:border-cyan-500/50 hover:text-cyan-300"
                }`}
                title={`Press & Hold Main Touch Sensor (GPIO${hw.touch.mainTouchPin})`}
              >
                <Hand className="w-3 h-3" />
                Head Touch · GPIO{hw.touch.mainTouchPin}
              </button>

              {/* Head + Side Earcups Assembly */}
              <div className="relative flex items-center justify-center">
                {/* Left Earcup */}
                <div className="w-7 sm:w-8 h-[112px] sm:h-[126px] -mr-2 rounded-l-2xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-700/80 shadow-xl flex items-center justify-center z-0">
                  <div
                    className="w-1.5 h-14 rounded-full transition-opacity duration-200"
                    style={{
                      backgroundColor: cust.body.accentColor,
                      opacity: runtimeSnapshot.state === "RUNNING" ? 0.75 : 0.18,
                      boxShadow:
                        runtimeSnapshot.state === "RUNNING"
                          ? `0 0 12px ${cust.body.accentColor}`
                          : "none",
                    }}
                  />
                </div>

                {/* Main EMO Head Shell */}
                <div
                  className={`relative z-10 w-[262px] sm:w-[322px] rounded-[34px] p-3.5 sm:p-4 border border-slate-700/80 shadow-[0_24px_60px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.14)] ${bodySurfaceClass}`}
                  style={{
                    backgroundColor: cust.body.bodyColor,
                  }}
                >
                  {/* Top bevel LED indicator reflecting onboard LED_BUILTIN (GPIO2) */}
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          ledPinState?.digitalValue === 1
                            ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                            : "bg-slate-700"
                        }`}
                        title="Onboard LED (GPIO2)"
                      />
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                        EMO-SIM
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">
                      {runtimeSnapshot.oledActivePixels > 0
                        ? `${runtimeSnapshot.oledActivePixels} px lit`
                        : "OLED BLANK"}
                    </span>
                  </div>

                  {/* Glossy Curved OLED Visor Frame */}
                  <div
                    className={`relative rounded-[22px] p-2.5 sm:p-3 bg-[#020408] border-2 transition-all duration-200 overflow-hidden ${
                      cust.oled.frameDesign === "lab_bench"
                        ? "border-cyan-500/40 rounded-lg"
                        : cust.oled.frameDesign === "bezel_minimal"
                        ? "border-slate-800 rounded-xl p-1.5"
                        : "border-[#1c2536]"
                    }`}
                    style={{
                      transform: `translateY(${cust.body.screenOffsetY}px)`,
                      boxShadow:
                        litRatio > 0
                          ? `inset 0 0 24px rgba(0,0,0,0.9), 0 0 ${Math.round(
                              litRatio * 24
                            )}px ${phosphorColor}33`
                          : "inset 0 0 24px rgba(0,0,0,0.95)",
                    }}
                  >
                    {/* Subtle optical glass sheen */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.045] via-transparent to-transparent z-10" />

                    {/* Actual 128x64 SSD1306 Framebuffer Canvas */}
                    <OledCanvas
                      oled={runtimeRef.current.oled}
                      version={oledVersion}
                      customization={cust}
                    />
                  </div>

                  {/* Subtle chin sensor slit */}
                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <span className="h-1 w-10 rounded-full bg-slate-800/90" />
                  </div>
                </div>

                {/* Right Earcup = Interactive Wake Touch Sensor (GPIO18) */}
                <button
                  type="button"
                  onPointerDown={() => {
                    setWakePressed(true);
                    setTouchPressed("WAKE_TOUCH", true);
                  }}
                  onPointerUp={() => {
                    setWakePressed(false);
                    setTouchPressed("WAKE_TOUCH", false);
                  }}
                  onPointerLeave={() => {
                    if (wakePressed) {
                      setWakePressed(false);
                      setTouchPressed("WAKE_TOUCH", false);
                    }
                  }}
                  title={`Press & Hold Wake Touch Sensor (GPIO${hw.touch.wakeTouchPin})`}
                  className={`w-7 sm:w-8 h-[112px] sm:h-[126px] -ml-2 rounded-r-2xl border shadow-xl flex flex-col items-center justify-center gap-1 transition-all z-0 ${
                    wakePressed
                      ? "bg-cyan-500/25 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.4)]"
                      : "bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border-slate-700/80 hover:border-cyan-500/50"
                  }`}
                >
                  <div
                    className="w-1.5 h-14 rounded-full transition-opacity duration-200"
                    style={{
                      backgroundColor: wakePressed ? "#22D3EE" : cust.body.accentColor,
                      opacity: wakePressed || runtimeSnapshot.state === "RUNNING" ? 0.85 : 0.2,
                    }}
                  />
                </button>
              </div>

              {/* Neck & Articulated EMO Feet */}
              <div className="w-12 h-4 bg-gradient-to-b from-slate-900 to-slate-800 border-x border-slate-700/60" />
              <div className="flex items-start justify-center gap-9">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-7 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-md border-x border-slate-700/70" />
                  <div className="w-16 h-5 -mt-1 rounded-full bg-gradient-to-b from-slate-700 to-slate-950 border border-slate-700/80 shadow-lg" />
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-5 h-7 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-md border-x border-slate-700/70" />
                  <div className="w-16 h-5 -mt-1 rounded-full bg-gradient-to-b from-slate-700 to-slate-950 border border-slate-700/80 shadow-lg" />
                </div>
              </div>

              {/* Contact Desk Shadow */}
              <div
                className="w-[240px] sm:w-[290px] h-6 mt-2 rounded-full blur-md"
                style={{
                  background: `radial-gradient(ellipse, rgba(0,0,0,${
                    (cust.body.shadowOpacity / 100) * 0.9
                  }), transparent 70%)`,
                }}
              />
            </div>
          </div>

          {/* Empty Robot Honest Onboarding Overlay (Outside the OLED so OLED stays 100% blank!) */}
          {!hasFirmware && (
            <div className="mt-4 max-w-md w-full rounded-xl border border-[#1E293B] bg-[#0B101A]/90 backdrop-blur-md p-4 text-center shadow-2xl">
              <div className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 mb-1">
                Blank Virtual Hardware — Zero Pre-Programmed Behaviour
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                This EMO virtual body starts completely empty with a blank 128×64 OLED display.
                Import your own ESP32 / Arduino firmware (.ino, .cpp, .h) to analyse hardware
                capabilities and drive the virtual display &amp; sensors.
              </p>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide transition shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              >
                <Download className="w-4 h-4" />
                IMPORT CODE
              </button>
            </div>
          )}

          {hasFirmware && runtimeSnapshot.state !== "RUNNING" && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-mono text-slate-400 px-3 py-1.5 rounded-lg bg-[#0D1320]/90 border border-[#1D283A]">
                Firmware Ready: <strong className="text-slate-200">{activeSnapshot?.label ?? "Working Files"}</strong>
              </span>
              <button
                type="button"
                onClick={runNow}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                RUN FIRMWARE
              </button>
            </div>
          )}
        </div>

        {/* Bottom Direct Touch & Hardware Trigger Dock */}
        <div className="px-4 py-3 border-t border-[#1A2333] bg-[#0B0F17]/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 mr-1 uppercase">
              Touch Inputs:
            </span>
            <button
              type="button"
              onClick={() => triggerTouchGesture("MAIN_TOUCH", "SHORT_PRESS")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#111827] hover:bg-cyan-500/15 border border-[#1F2A3E] hover:border-cyan-500/40 text-slate-200 transition"
            >
              Short Tap (G{hw.touch.mainTouchPin})
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("MAIN_TOUCH", "DOUBLE_TAP")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#111827] hover:bg-cyan-500/15 border border-[#1F2A3E] hover:border-cyan-500/40 text-slate-200 transition"
            >
              Double Tap
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("MAIN_TOUCH", "LONG_PRESS")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#111827] hover:bg-cyan-500/15 border border-[#1F2A3E] hover:border-cyan-500/40 text-slate-200 transition"
            >
              Long Press ({hw.touch.longPressMs}ms)
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("WAKE_TOUCH", "SHORT_PRESS")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#111827] hover:bg-sky-500/15 border border-[#1F2A3E] hover:border-sky-500/40 text-slate-200 transition"
            >
              Wake Tap (G{hw.touch.wakeTouchPin})
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("BOTH", "BOTH_HOLD")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#111827] hover:bg-amber-500/15 border border-[#1F2A3E] hover:border-amber-500/40 text-amber-200 transition"
            >
              Hold Both ({hw.touch.bothTouchHoldMs / 1000}s)
            </button>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Drag robot to orbit 3D view
          </span>
        </div>
      </div>

      {/* Right Telemetry & Status Rail */}
      <div className="flex flex-col gap-3">
        {/* Live Runtime Telemetry Card */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Live Telemetry
            </h2>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                runtimeSnapshot.state === "RUNNING"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : runtimeSnapshot.state === "ERROR"
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  : runtimeSnapshot.state === "PAUSED"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {runtimeSnapshot.state}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-2.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Sim Clock</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5">
                {runtimeSnapshot.simTimeMs} ms
              </div>
            </div>
            <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-2.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Loop Cycles</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5">
                {runtimeSnapshot.loopIterations.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-2.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase">OLED Frames</div>
              <div className="text-sm font-mono font-semibold text-cyan-300 mt-0.5">
                {runtimeSnapshot.oledFrameCount}
              </div>
            </div>
            <div className="rounded-xl bg-[#0F1521] border border-[#1A2333] p-2.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Lit Pixels</div>
              <div className="text-sm font-mono font-semibold text-cyan-300 mt-0.5">
                {runtimeSnapshot.oledActivePixels} / 8192
              </div>
            </div>
          </div>

          {/* Hardware Pin Quick Monitor */}
          <div className="space-y-1.5 pt-1 border-t border-[#1A2333]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Main Touch (GPIO{hw.touch.mainTouchPin})</span>
              <span
                className={
                  mainPinState?.digitalValue === (hw.touch.touchActive === "HIGH" ? 1 : 0)
                    ? "text-cyan-400 font-semibold"
                    : "text-slate-500"
                }
              >
                {mainPinState?.digitalValue === 1 ? "HIGH" : "LOW"} · cap:{mainPinState?.touchValue ?? 74}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Wake Touch (GPIO{hw.touch.wakeTouchPin})</span>
              <span
                className={
                  wakePinState?.digitalValue === (hw.touch.touchActive === "HIGH" ? 1 : 0)
                    ? "text-sky-400 font-semibold"
                    : "text-slate-500"
                }
              >
                {wakePinState?.digitalValue === 1 ? "HIGH" : "LOW"} · cap:{wakePinState?.touchValue ?? 74}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Audio Output
              </span>
              <span className="text-slate-300">
                {runtimeSnapshot.audioState.buzzerActive
                  ? `Buzzer ${runtimeSnapshot.audioState.buzzerFreqHz}Hz`
                  : runtimeSnapshot.audioState.speakerActive
                  ? `Speaker ${runtimeSnapshot.audioState.speakerFreqHz}Hz`
                  : "Idle"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Virtual Battery
              </span>
              <span className="text-emerald-400">{hw.battery.levelPercent}%</span>
            </div>
          </div>
        </div>

        {/* Firmware Capability Quick Summary */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Firmware Status
            </h2>
            <button
              type="button"
              onClick={() => setActiveSection("capability_center")}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition"
            >
              Capability Center →
            </button>
          </div>

          {!hasFirmware ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              No firmware loaded. Active snapshot: <span className="font-mono text-slate-400">none</span>.
              Simulator displays only instructions emitted by imported firmware.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-300 font-medium truncate">
                {activeSnapshot?.label ?? "Unsaved Workspace"}
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                {currentAnalysis?.summary ?? "Click ANALYSE to inspect firmware."}
              </div>

              {unsupportedDetected.length > 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {unsupportedDetected.length} Unsupported Feature(s) Detected
                  </div>
                  <div className="text-[11px] text-amber-200/80">
                    {unsupportedDetected.map((u) => u.featureName).join(", ")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("capability_center")}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 underline hover:text-amber-100"
                  >
                    <Sparkles className="w-3 h-3" />
                    Open Capability Center to Implement Support
                  </button>
                </div>
              )}

              {runtimeSnapshot.lastError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-200 font-mono">
                  {runtimeSnapshot.lastError.file}:{runtimeSnapshot.lastError.line} —{" "}
                  {runtimeSnapshot.lastError.message}
                </div>
              )}
            </div>
          )}

          {/* Quick Navigation Links */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1A2333]">
            <button
              type="button"
              onClick={() => setActiveSection("hardware_lab")}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#111827] hover:bg-[#162033] border border-[#1E293B] text-xs text-slate-300 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Hardware Lab
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("customization")}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#111827] hover:bg-[#162033] border border-[#1E293B] text-xs text-slate-300 transition"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Customize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
