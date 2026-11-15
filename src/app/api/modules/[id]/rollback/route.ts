import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { firmwareFiles, firmwareSnapshots, simulatorModules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded, getAllPersistedModules } from "@/lib/server/db-helpers";
import { rollbackModuleExtension } from "@/lib/simulator/extension/engine";
import { HARDWARE_MODULE_MAP } from "@/lib/simulator/modules/registry";
import type { FirmwareFileData } from "@/lib/simulator/types";

export const dynamic = "force-dynamic";

const rollbackSchema = z.object({
  snapshotId: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSeeded();
    const { id: moduleId } = await context.params;
    if (!HARDWARE_MODULE_MAP.has(moduleId)) {
      return Response.json({ error: `Unknown simulator module '${moduleId}'` }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = rollbackSchema.safeParse(body);
    const snapshotId = parsed.success ? parsed.data.snapshotId : null;

    const currentModules = await getAllPersistedModules();
    let files: FirmwareFileData[] | undefined;
    if (snapshotId) {
      const fRows = await db
        .select()
        .from(firmwareFiles)
        .where(eq(firmwareFiles.snapshotId, snapshotId));
      files = fRows.map((f) => ({
        id: f.id,
        path: f.path,
        name: f.name,
        extension: f.extension,
        content: f.content,
        sizeBytes: f.sizeBytes,
      }));
    }

    const { updatedModule, reanalysis } = rollbackModuleExtension(
      moduleId,
      currentModules,
      files
    );

    await db
      .update(simulatorModules)
      .set({
        enabled: updatedModule.enabled,
        supportLevel: updatedModule.supportLevel,
        isExtended: updatedModule.isExtended,
        extensionHistory: updatedModule.extensionHistory,
        updatedAt: new Date(),
      })
      .where(eq(simulatorModules.id, moduleId));

    if (snapshotId && reanalysis) {
      await db
        .update(firmwareSnapshots)
        .set({
          analysisReport: reanalysis.analysisReport,
          capabilityReport: reanalysis.capabilityReport,
        })
        .where(eq(firmwareSnapshots.id, snapshotId));
    }

    const modules = await getAllPersistedModules();
    return Response.json({
      ok: true,
      updatedModule,
      modules,
      reanalysis: reanalysis ?? null,
    });
  } catch (err) {
    console.error("[POST /api/modules/[id]/rollback]", err);
    return Response.json({ error: "Failed to rollback simulator module" }, { status: 500 });
  }
}
