"use client";

import React, { useEffect, useRef } from "react";
import type { CustomizationConfig } from "@/lib/simulator/types";
import type { VirtualSSD1306 } from "@/lib/simulator/oled/ssd1306";

interface OledCanvasProps {
  oled: VirtualSSD1306;
  version: number;
  customization: CustomizationConfig;
  className?: string;
  compact?: boolean;
}

export function OledCanvas({
  oled,
  version,
  customization,
  className = "",
  compact = false,
}: OledCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = compact ? 2 : Math.max(2, Math.min(5, Math.round(customization.oled.scale || 3)));
    const w = oled.width * scale;
    const h = oled.height * scale;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const bg = customization.oled.backgroundColor || "#020408";
    const phosphor = customization.oled.phosphorColor || "#22D3EE";
    const style = customization.oled.pixelStyle || "grid";
    const buf = oled.getDisplayBuffer();
    const inverted = oled.inverted;
    const dimmed = oled.dimmed;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Draw subtle unlit OLED matrix cells when grid style is active
    if (style === "grid" && scale >= 3) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.035)";
      for (let y = 0; y < oled.height; y++) {
        for (let x = 0; x < oled.width; x++) {
          ctx.fillRect(x * scale, y * scale, scale - 0.6, scale - 0.6);
        }
      }
    }

    const alpha = dimmed ? 0.45 : Math.max(0.2, Math.min(1, customization.oled.brightness / 100));
    ctx.globalAlpha = alpha;

    const gap = style === "grid" && scale >= 3 ? 0.65 : 0;
    const pxSize = Math.max(1, scale - gap);

    if (style === "glow") {
      ctx.shadowColor = phosphor;
      ctx.shadowBlur = Math.max(3, scale * 1.5);
    } else {
      ctx.shadowBlur = 0;
    }

    for (let y = 0; y < oled.height; y++) {
      const rowOffset = y * oled.width;
      // Dual-zone SSD1306: top 16 rows yellow (#FACC15), lower 48 rows cyan/phosphor
      const rowColor = style === "dual_zone" ? (y < 16 ? "#FACC15" : phosphor) : phosphor;
      ctx.fillStyle = rowColor;
      if (style === "glow" && style === "dual_zone" as string) {
        ctx.shadowColor = rowColor;
      }

      for (let x = 0; x < oled.width; x++) {
        const raw = buf[rowOffset + x] !== 0;
        const lit = inverted ? !raw : raw;
        if (lit) {
          ctx.fillRect(x * scale, y * scale, pxSize, pxSize);
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Optional visual-only eye overlay preview — strictly disabled by default and clearly labeled!
    if (customization.eyes.visualOverrideEnabled && !compact) {
      const e = customization.eyes;
      ctx.save();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = Math.max(1, scale * 0.5);
      ctx.setLineDash([scale * 2, scale]);
      const eyeW = e.width * e.size * scale;
      const eyeH = e.height * e.size * scale;
      const sp = e.spacing * scale;
      const cx = w / 2 + e.offsetX * scale;
      const cy = h / 2 + e.offsetY * scale;
      const r = e.shape === "sharp" ? 0 : e.shape === "oval" ? Math.min(eyeW, eyeH) / 2 : 5 * scale;

      const drawGuide = (gx: number, gy: number) => {
        ctx.beginPath();
        ctx.roundRect(gx, gy, eyeW, eyeH, r);
        ctx.stroke();
        if (e.pupilSize > 0) {
          ctx.beginPath();
          ctx.arc(
            gx + eyeW / 2 + e.gazeX * scale,
            gy + eyeH / 2 + e.gazeY * scale,
            e.pupilSize * scale,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      };
      drawGuide(cx - sp / 2 - eyeW, cy - eyeH / 2);
      drawGuide(cx + sp / 2, cy - eyeH / 2);
      ctx.restore();
    }
  }, [oled, version, customization, compact]);

  const contrastPct = customization.oled.contrast || 100;
  const brightPct = customization.oled.brightness || 100;

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        filter: `contrast(${contrastPct}%) brightness(${brightPct}%)`,
      }}
      className={`block w-full h-auto rounded-sm ${className}`}
      aria-label="Virtual SSD1306 128x64 OLED Display"
    />
  );
}
