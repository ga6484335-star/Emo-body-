import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { firmwareFiles, firmwareSnapshots, projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getAllPersistedModules } from "@/lib/server/db-helpers";
import { analyzeFirmware } from "@/lib/simulator/analyzer/analyzer";
import type { FirmwareFileData } from "@/lib/simulator/types";

export const dynamic = "force-dynamic";

const patchSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(160).optional(),
  notes: z.string().max(1000).optional(),
  reanalyze: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id: projectId, snapshotId } = await context.params;
    const body = await req.json();
    const parsed = patchSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid snapshot patch" }, { status: 400 });
    }

    const snaps = await db
      .select()
      .from(firmwareSnapshots)
      .where(
        and(eq(firmwareSnapshots.id, snapshotId), eq(firmwareSnapshots.projectId, projectId))
      );
    if (snaps.length === 0) {
      return Response.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.label !== undefined) updates.label = parsed.data.label;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

    const filesRows = await db
      .select()
      .from(firmwareFiles)
      .where(eq(firmwareFiles.snapshotId, snapshotId));
    const files: FirmwareFileData[] = filesRows.map((f) => ({
      id: f.id,
      path: f.path,
      name: f.name,
      extension: f.extension,
      content: f.content,
      sizeBytes: f.sizeBytes,
    }));

    if (parsed.data.reanalyze) {
      const modules = await getAllPersistedModules();
      const { analysisReport, capabilityReport } = analyzeFirmware(files, modules);
      updates.analysisReport = analysisReport;
      updates.capabilityReport = capabilityReport;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(firmwareSnapshots)
        .set(updates)
        .where(eq(firmwareSnapshots.id, snapshotId));
    }

    const [updated] = await db
      .select()
      .from(firmwareSnapshots)
      .where(eq(firmwareSnapshots.id, snapshotId));

    return Response.json({
      snapshot: {
        id: updated.id,
        projectId: updated.projectId,
        versionNumber: updated.versionNumber,
        label: updated.label,
        sourceOrigin: updated.sourceOrigin,
        notes: updated.notes,
        isReadOnly: updated.isReadOnly,
        analysisReport: updated.analysisReport,
        capabilityReport: updated.capabilityReport,
        files,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/snapshots/[snapshotId]]", err);
    return Response.json({ error: "Failed to update snapshot" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id: projectId, snapshotId } = await context.params;
    const snaps = await db
      .select()
      .from(firmwareSnapshots)
      .where(
        and(eq(firmwareSnapshots.id, snapshotId), eq(firmwareSnapshots.projectId, projectId))
      );
    if (snaps.length === 0) {
      return Response.json({ error: "Snapshot not found" }, { status: 404 });
    }

    await db.delete(firmwareSnapshots).where(eq(firmwareSnapshots.id, snapshotId));

    // If deleted snapshot was active, switch project activeSnapshotId to latest remaining or null
    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    let newActiveId = proj?.activeSnapshotId ?? null;
    if (proj && proj.activeSnapshotId === snapshotId) {
      const remaining = await db
        .select({ id: firmwareSnapshots.id })
        .from(firmwareSnapshots)
        .where(eq(firmwareSnapshots.projectId, projectId))
        .orderBy(desc(firmwareSnapshots.versionNumber))
        .limit(1);
      newActiveId = remaining[0]?.id ?? null;
      await db
        .update(projects)
        .set({ activeSnapshotId: newActiveId, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    return Response.json({ ok: true, activeSnapshotId: newActiveId });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]/snapshots/[snapshotId]]", err);
    return Response.json({ error: "Failed to delete snapshot" }, { status: 500 });
  }
}
