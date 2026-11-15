"use client";

import React, { useState } from "react";
import {
  BatteryCharging,
  CircuitBoard,
  Cpu,
  Hand,
  Mic,
  Plus,
  Radio,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSimulator } from "../SimulatorProvider";
import {
  DEFAULT_HARDWARE_CONFIG,
  type AttachedComponent,
  type HardwareConfig,
} from "@/lib/simulator/types";
import { virtualAudio } from "@/lib/simulator/audio/webAudio";

const ESP32_DEVKIT_PINS = [
  2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39,
];

export function HardwareLabView() {
  const {
    activeProject,
    runtimeSnapshot,
    updateHardwareConfig,
    setTouchPressed,
    triggerTouchGesture,
    setDigitalPin,
    setAnalogPin,
    setMicLevel,
    setImuValues,
    showToast,
  } = useSimulator();

  const hw = activeProject?.hardwareConfig ?? DEFAULT_HARDWARE_CONFIG;
  const [newCompType, setNewCompType] = useState<AttachedComponent["type"]>("button");
  const [newCompName, setNewCompName] = useState("Aux Button");
  const [newCompPin, setNewCompPin] = useState(14);

  const patchHw = (updater: (prev: HardwareConfig) => HardwareConfig) => {
    const next = updater(hw);
    updateHardwareConfig(next);
  };

  const handleAddComponent = () => {
    const comp: AttachedComponent = {
      id: `comp_${Date.now()}`,
      type: newCompType,
      name: newCompName.trim() || newCompType,
      pins: [newCompPin],
    };
    patchHw((prev) => ({
      ...prev,
      components: [...prev.components, comp],
    }));
    showToast("success", `Attached ${comp.name} to GPIO${newCompPin}.`);
  };

  const handleRemoveComponent = (id: string) => {
    patchHw((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <CircuitBoard className="w-4 h-4 text-cyan-400" />
            Interactive Hardware Lab — Virtual ESP32 Bench
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Every touch sensor, pin toggle, ADC slider, and peripheral input enters the live firmware simulation runtime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Board:</label>
          <select
            value={hw.boardType}
            onChange={(e) =>
              patchHw((prev) => ({
                ...prev,
                boardType: e.target.value as HardwareConfig["boardType"],
              }))
            }
            className="px-3 py-1.5 rounded-lg bg-[#070B12] border border-[#223048] text-xs font-mono text-cyan-300"
          >
            <option value="ESP32 DevKit V1">ESP32 DevKit V1</option>
            <option value="ESP32-S3 DevKit">ESP32-S3 DevKit</option>
            <option value="ESP32-C3 Mini">ESP32-C3 Mini</option>
            <option value="Arduino Uno (Compat)">Arduino Uno (Compat)</option>
          </select>
        </div>
      </div>

      {/* Top Interactive Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Touch Sensors & Timing Constants */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Hand className="w-3.5 h-3.5" /> Touch Sensors &amp; EMO Timing
          </h2>

          {/* Live Touch Trigger Pads */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onPointerDown={() => setTouchPressed("MAIN_TOUCH", true)}
              onPointerUp={() => setTouchPressed("MAIN_TOUCH", false)}
              onPointerLeave={() => setTouchPressed("MAIN_TOUCH", false)}
              className="py-3 px-2 rounded-xl bg-[#111927] active:bg-cyan-500/25 border border-[#23324B] active:border-cyan-400 text-xs font-mono text-cyan-200 transition select-none"
            >
              Hold MAIN (G{hw.touch.mainTouchPin})
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchPressed("WAKE_TOUCH", true)}
              onPointerUp={() => setTouchPressed("WAKE_TOUCH", false)}
              onPointerLeave={() => setTouchPressed("WAKE_TOUCH", false)}
              className="py-3 px-2 rounded-xl bg-[#111927] active:bg-sky-500/25 border border-[#23324B] active:border-sky-400 text-xs font-mono text-sky-200 transition select-none"
            >
              Hold WAKE (G{hw.touch.wakeTouchPin})
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => triggerTouchGesture("MAIN_TOUCH", "SHORT_PRESS")}
              className="py-1.5 px-2 rounded-lg bg-[#0F1623] hover:bg-[#172235] border border-[#1E2A3F] text-[11px] font-mono text-slate-300"
            >
              Short Press
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("MAIN_TOUCH", "LONG_PRESS")}
              className="py-1.5 px-2 rounded-lg bg-[#0F1623] hover:bg-[#172235] border border-[#1E2A3F] text-[11px] font-mono text-slate-300"
            >
              Long ({hw.touch.longPressMs}ms)
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("MAIN_TOUCH", "DOUBLE_TAP")}
              className="py-1.5 px-2 rounded-lg bg-[#0F1623] hover:bg-[#172235] border border-[#1E2A3F] text-[11px] font-mono text-slate-300"
            >
              Double Tap
            </button>
            <button
              type="button"
              onClick={() => triggerTouchGesture("BOTH", "BOTH_HOLD")}
              className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono text-amber-200"
            >
              Both Hold ({hw.touch.bothTouchHoldMs}ms)
            </button>
          </div>

          {/* Pin & Active Level Config */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1A2333] text-[11px] font-mono">
            <label className="space-y-1">
              <span className="text-slate-500 block">Main GPIO</span>
              <input
                type="number"
                value={hw.touch.mainTouchPin}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, mainTouchPin: Number(e.target.value) },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">Wake GPIO</span>
              <input
                type="number"
                value={hw.touch.wakeTouchPin}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, wakeTouchPin: Number(e.target.value) },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">Active</span>
              <select
                value={hw.touch.touchActive}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, touchActive: e.target.value as "HIGH" | "LOW" },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              >
                <option value="HIGH">HIGH</option>
                <option value="LOW">LOW</option>
              </select>
            </label>
          </div>

          {/* Known EMO Timing Constants */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <label className="space-y-1">
              <span className="text-slate-500 block">Debounce (ms)</span>
              <input
                type="number"
                value={hw.touch.debounceMs}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, debounceMs: Number(e.target.value) },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">Long Press (ms)</span>
              <input
                type="number"
                value={hw.touch.longPressMs}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, longPressMs: Number(e.target.value) },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">Tap Interval (ms)</span>
              <input
                type="number"
                value={hw.touch.tapIntervalMs}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, tapIntervalMs: Number(e.target.value) },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">Sleep Timeout (ms)</span>
              <input
                type="number"
                value={hw.touch.sleepTimeoutMs}
                onChange={(e) =>
                  patchHw((p) => ({
                    ...p,
                    touch: { ...p.touch, sleepTimeoutMs: Number(e.target.value) },
                  }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
          </div>
        </div>

        {/* 2. OLED I2C Bus & Battery / Analog Sensors */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> I2C OLED &amp; Power Sensors
          </h2>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
            <label className="space-y-1">
              <span className="text-slate-500 block">I2C Addr</span>
              <input
                value={hw.oled.i2cAddress}
                onChange={(e) =>
                  patchHw((p) => ({ ...p, oled: { ...p.oled, i2cAddress: e.target.value } }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-cyan-300"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">SDA GPIO</span>
              <input
                type="number"
                value={hw.oled.sdaPin}
                onChange={(e) =>
                  patchHw((p) => ({ ...p, oled: { ...p.oled, sdaPin: Number(e.target.value) } }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500 block">SCL GPIO</span>
              <input
                type="number"
                value={hw.oled.sclPin}
                onChange={(e) =>
                  patchHw((p) => ({ ...p, oled: { ...p.oled, sclPin: Number(e.target.value) } }))
                }
                className="w-full px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-slate-200"
              />
            </label>
          </div>

          {/* Battery Level Slider */}
          <div className="pt-2 border-t border-[#1A2333] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                Virtual Battery (GPIO{hw.battery.adcPin})
              </span>
              <span className="text-emerald-300">
                {hw.battery.levelPercent}% · {(3.3 + (hw.battery.levelPercent / 100) * 0.9).toFixed(2)}V
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={hw.battery.levelPercent}
              onChange={(e) =>
                patchHw((p) => ({
                  ...p,
                  battery: { ...p.battery, levelPercent: Number(e.target.value) },
                }))
              }
              className="w-full accent-emerald-400"
            />
          </div>

          {/* Virtual Microphone Amplitude Input (Strictly separate from Speaker!) */}
          <div className="pt-2 border-t border-[#1A2333] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                Virtual Mic Input (G{hw.audio.microphonePin})
              </span>
              <span className="text-amber-300">{runtimeSnapshot.audioState.micLevel} / 4095</span>
            </div>
            <input
              type="range"
              min={0}
              max={4095}
              value={runtimeSnapshot.audioState.micLevel}
              onChange={(e) => setMicLevel(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <p className="text-[10px] text-slate-500 leading-snug">
              Simulated amplitude input only — strictly isolated from speaker/buzzer output. Does not emulate ESP32 I2S DMA hardware.
            </p>
          </div>

          {/* Virtual IMU Tilt */}
          <div className="pt-2 border-t border-[#1A2333] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                Virtual IMU Tilt X/Y
              </span>
              <span className="text-slate-400">
                ax:{runtimeSnapshot.imu.ax} ay:{runtimeSnapshot.imu.ay}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="range"
                min={-16384}
                max={16384}
                value={runtimeSnapshot.imu.ax}
                onChange={(e) => setImuValues({ ax: Number(e.target.value) })}
                className="accent-sky-400"
              />
              <input
                type="range"
                min={-16384}
                max={16384}
                value={runtimeSnapshot.imu.ay}
                onChange={(e) => setImuValues({ ay: Number(e.target.value) })}
                className="accent-sky-400"
              />
            </div>
          </div>
        </div>

        {/* 3. Audio Output Bench & Attached Components */}
        <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Audio &amp; Components
            </h2>
            <button
              type="button"
              onClick={() =>
                patchHw((p) => ({ ...p, audio: { ...p.audio, muted: !p.audio.muted } }))
              }
              className={`px-2 py-1 rounded-md text-[11px] font-mono border flex items-center gap-1 ${
                hw.audio.muted
                  ? "bg-rose-500/15 border-rose-500/35 text-rose-300"
                  : "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
              }`}
            >
              {hw.audio.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {hw.audio.muted ? "Muted" : "Audio On"}
            </button>
          </div>

          {/* Separate Buzzer vs Speaker Audio Bench Tests */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                virtualAudio.muted = hw.audio.muted;
                virtualAudio.volume = hw.audio.volume;
                virtualAudio.playBuzzer(1046, 180);
                showToast("info", "Tested Piezo Buzzer channel (1046Hz square wave, 180ms).");
              }}
              className="py-2 px-2.5 rounded-lg bg-[#111927] hover:bg-cyan-500/15 border border-[#223048] text-xs font-mono text-slate-200"
            >
              Test Buzzer (G{hw.audio.buzzerPin})
            </button>
            <button
              type="button"
              onClick={() => {
                virtualAudio.muted = hw.audio.muted;
                virtualAudio.volume = hw.audio.volume;
                virtualAudio.playSpeaker(523);
                setTimeout(() => virtualAudio.stopSpeaker(), 220);
                showToast("info", "Tested Speaker channel (523Hz triangle synth, 220ms).");
              }}
              className="py-2 px-2.5 rounded-lg bg-[#111927] hover:bg-sky-500/15 border border-[#223048] text-xs font-mono text-slate-200"
            >
              Test Speaker (G{hw.audio.speakerPin})
            </button>
          </div>

          {/* Add Virtual Component */}
          <div className="pt-2 border-t border-[#1A2333] space-y-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Attached Components ({hw.components.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              <select
                value={newCompType}
                onChange={(e) => setNewCompType(e.target.value as AttachedComponent["type"])}
                className="px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-[11px] font-mono text-slate-200"
              >
                <option value="button">Push Button</option>
                <option value="led">Status LED</option>
                <option value="touch_sensor">Touch Pad</option>
                <option value="potentiometer">Potentiometer</option>
                <option value="servo">Servo Motor</option>
                <option value="buzzer">Piezo Buzzer</option>
                <option value="speaker">Speaker</option>
                <option value="microphone">Microphone</option>
              </select>
              <input
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                placeholder="Label"
                className="flex-1 min-w-[80px] px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-[11px] text-slate-200"
              />
              <input
                type="number"
                value={newCompPin}
                onChange={(e) => setNewCompPin(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded bg-[#070B12] border border-[#1E293B] text-[11px] font-mono text-slate-200"
                title="GPIO Pin"
              />
              <button
                type="button"
                onClick={handleAddComponent}
                className="px-2 py-1 rounded bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center"
                title="Attach Component"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1">
              {hw.components.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#0D1320] border border-[#182235] text-xs"
                >
                  <div className="min-w-0">
                    <div className="text-slate-200 font-medium truncate">{c.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {c.type} · GPIO{c.pins.join(", GPIO")}
                      {c.i2cAddress ? ` · ${c.i2cAddress}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.type === "button" && c.pins[0] !== undefined && (
                      <button
                        type="button"
                        onPointerDown={() => setDigitalPin(c.pins[0], 0)}
                        onPointerUp={() => setDigitalPin(c.pins[0], 1)}
                        className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]"
                      >
                        Press
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(c.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ESP32 DevKit V1 Interactive GPIO Pin Matrix */}
      <div className="rounded-2xl border border-[#1A2333] bg-[#0B0F17] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300">
            ESP32 Live GPIO Pin Inspector &amp; Injector
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Toggle any digital input HIGH/LOW or adjust 12-bit ADC value directly into firmware runtime
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {ESP32_DEVKIT_PINS.map((pinNum) => {
            const st = runtimeSnapshot.pins[pinNum];
            if (!st) return null;
            const isHigh = st.digitalValue === 1;
            const isAdcCapable = pinNum >= 32 || pinNum === 25 || pinNum === 26 || pinNum === 27;
            return (
              <div
                key={pinNum}
                className={`rounded-xl border p-2.5 text-xs font-mono transition ${
                  isHigh
                    ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                    : "border-[#182235] bg-[#0D1320]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isHigh ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-slate-700"
                      }`}
                    />
                    <span className="text-slate-100 font-semibold">GPIO{pinNum}</span>
                    {st.label && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 truncate">
                        {st.label}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDigitalPin(pinNum, isHigh ? 0 : 1)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                      isHigh
                        ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {isHigh ? "HIGH" : "LOW"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                  <span>{st.mode}</span>
                  <span>
                    PWM:{st.pwmValue} · ADC:{st.analogValue}
                  </span>
                </div>

                {isAdcCapable && (
                  <input
                    type="range"
                    min={0}
                    max={4095}
                    value={st.analogValue}
                    onChange={(e) => setAnalogPin(pinNum, Number(e.target.value))}
                    className="w-full mt-1.5 h-1 accent-cyan-400"
                    aria-label={`GPIO${pinNum} ADC Value`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
