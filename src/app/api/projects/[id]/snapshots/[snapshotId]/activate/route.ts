import { NextRequest } from "next/server";
import { db } from "@/db";
import { firmwareSnapshots, projects } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id: projectId, snapshotId } = await context.params;
    const found = await db
      .select()
      .from(firmwareSnapshots)
      .where(
        and(eq(firmwareSnapshots.id, snapshotId), eq(firmwareSnapshots.projectId, projectId))
      );

    if (found.length === 0) {
      return Response.json({ error: "Snapshot not found" }, { status: 404 });
    }

    await db
      .update(projects)
      .set({ activeSnapshotId: snapshotId, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return Response.json({ ok: true, activeSnapshotId: snapshotId });
  } catch (err) {
    console.error("[POST /api/projects/[id]/snapshots/[snapshotId]/activate]", err);
    return Response.json({ error: "Failed to switch firmware snapshot" }, { status: 500 });
  }
}
