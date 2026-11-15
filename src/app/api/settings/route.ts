import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded, getGlobalSettings } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

const settingsPatchSchema = z.object({
  editorTheme: z.enum(["oled-dark", "one-dark", "high-contrast"]).optional(),
  editorFontSize: z.number().min(10).max(24).optional(),
  editorTabSize: z.number().min(2).max(8).optional(),
  maxInstructionsPerTick: z.number().min(1000).max(200000).optional(),
  maxCallStackDepth: z.number().min(16).max(256).optional(),
  defaultBaudRate: z.number().min(300).max(921600).optional(),
  showHardwareLimitationsBanner: z.boolean().optional(),
  aiExtensionAssistant: z
    .object({
      enabled: z.boolean(),
      provider: z.enum(["none", "openai-compatible"]),
      endpointUrl: z.string().max(300),
      model: z.string().max(120),
      apiKeyConfigured: z.boolean(),
    })
    .optional(),
});

export async function GET() {
  try {
    await ensureSeeded();
    const settings = await getGlobalSettings();
    return Response.json({ settings });
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    const current = await getGlobalSettings();
    const merged = {
      ...current,
      ...parsed.data,
      aiExtensionAssistant: parsed.data.aiExtensionAssistant
        ? { ...current.aiExtensionAssistant, ...parsed.data.aiExtensionAssistant }
        : current.aiExtensionAssistant,
    };

    await db
      .update(appSettings)
      .set({ settings: merged, updatedAt: new Date() })
      .where(eq(appSettings.id, "global"));

    return Response.json({ settings: merged });
  } catch (err) {
    console.error("[PATCH /api/settings]", err);
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
