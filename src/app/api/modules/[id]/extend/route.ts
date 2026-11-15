import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { firmwareFiles, firmwareSnapshots, simulatorModules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded, getAllPersistedModules } from "@/lib/server/db-helpers";
import { executeModuleExtension } from "@/lib/simulator/extension/engine";
import { HARDWARE_MODULE_MAP } from "@/lib/simulator/modules/registry";
import type { FirmwareFileData } from "@/lib/simulator/types";

export const dynamic = "force-dynamic";

const extendSchema = z.object({
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
    const parsed = extendSchema.safeParse(body);
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

    const result = executeModuleExtension(moduleId, currentModules, files);

    // Persist updated module state and history
    await db
      .update(simulatorModules)
      .set({
        enabled: result.updatedModule.enabled,
        supportLevel: result.updatedModule.supportLevel,
        isExtended: result.updatedModule.isExtended,
        extensionHistory: result.updatedModule.extensionHistory,
        lastTestResult: result.updatedModule.lastTestResult,
        updatedAt: new Date(),
      })
      .where(eq(simulatorModules.id, moduleId));

    // Persist reanalysed capability & analysis report back onto snapshot (never modifying firmware files!)
    if (snapshotId && result.reanalysis) {
      await db
        .update(firmwareSnapshots)
        .set({
          analysisReport: result.reanalysis.analysisReport,
          capabilityReport: result.reanalysis.capabilityReport,
        })
        .where(eq(firmwareSnapshots.id, snapshotId));
    }

    const modules = await getAllPersistedModules();

    return Response.json({
      success: result.success,
      finalStatus: result.finalStatus,
      updatedModule: result.updatedModule,
      modules,
      testResult: result.testResult,
      steps: result.steps,
      reanalysis: result.reanalysis ?? null,
    });
  } catch (err) {
    console.error("[POST /api/modules/[id]/extend]", err);
    return Response.json(
      { error: "Failed to execute simulator module extension" },
      { status: 500 }
    );
  }
}
