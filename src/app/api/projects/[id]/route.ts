import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSnapshotsForProject } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  boardType: z.string().max(80).optional(),
  activeSnapshotId: z.string().nullable().optional(),
  hardwareConfig: z.record(z.string(), z.unknown()).optional(),
  customization: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const rows = await db.select().from(projects).where(eq(projects.id, id));
    if (rows.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const p = rows[0];
    const snapshots = await getSnapshotsForProject(id);
    return Response.json({
      project: {
        id: p.id,
        name: p.name,
        description: p.description,
        boardType: p.boardType,
        activeSnapshotId: p.activeSnapshotId,
        hardwareConfig: p.hardwareConfig,
        customization: p.customization,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        snapshotCount: snapshots.length,
      },
      snapshots,
    });
  } catch (err) {
    console.error("[GET /api/projects/[id]]", err);
    return Response.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid update payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.select().from(projects).where(eq(projects.id, id));
    if (existing.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.boardType !== undefined) updates.boardType = parsed.data.boardType;
    if (parsed.data.activeSnapshotId !== undefined)
      updates.activeSnapshotId = parsed.data.activeSnapshotId;
    if (parsed.data.hardwareConfig !== undefined)
      updates.hardwareConfig = parsed.data.hardwareConfig;
    if (parsed.data.customization !== undefined)
      updates.customization = parsed.data.customization;

    await db.update(projects).set(updates).where(eq(projects.id, id));
    const [updated] = await db.select().from(projects).where(eq(projects.id, id));

    return Response.json({
      project: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        boardType: updated.boardType,
        activeSnapshotId: updated.activeSnapshotId,
        hardwareConfig: updated.hardwareConfig,
        customization: updated.customization,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]]", err);
    return Response.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await db.select().from(projects).where(eq(projects.id, id));
    if (existing.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    await db.delete(projects).where(eq(projects.id, id));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]]", err);
    return Response.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
