import { NextRequest } from "next/server";
import { db } from "@/db";
import { firmwareFiles, firmwareSnapshots, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSnapshotsForProject, newId } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const rows = await db.select().from(projects).where(eq(projects.id, id));
    if (rows.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const src = rows[0];
    const srcSnaps = await getSnapshotsForProject(id);

    const newProjId = newId("proj");
    const snapIdMap = new Map<string, string>();
    for (const s of srcSnaps) {
      snapIdMap.set(s.id, newId("snap"));
    }

    const newActiveSnapId = src.activeSnapshotId
      ? snapIdMap.get(src.activeSnapshotId) ?? null
      : null;

    const now = new Date();
    await db.insert(projects).values({
      id: newProjId,
      name: `${src.name} (Copy)`,
      description: src.description,
      boardType: src.boardType,
      activeSnapshotId: newActiveSnapId,
      hardwareConfig: src.hardwareConfig,
      customization: src.customization,
      createdAt: now,
      updatedAt: now,
    });

    for (const s of srcSnaps) {
      const targetSnapId = snapIdMap.get(s.id)!;
      await db.insert(firmwareSnapshots).values({
        id: targetSnapId,
        projectId: newProjId,
        versionNumber: s.versionNumber,
        label: s.label,
        sourceOrigin: "duplicate",
        notes: s.notes,
        isReadOnly: s.isReadOnly,
        analysisReport: s.analysisReport,
        capabilityReport: s.capabilityReport,
        createdAt: new Date(s.createdAt),
      });

      for (const f of s.files) {
        await db.insert(firmwareFiles).values({
          id: newId("file"),
          snapshotId: targetSnapId,
          path: f.path,
          name: f.name,
          extension: f.extension,
          content: f.content,
          sizeBytes: f.sizeBytes,
          createdAt: now,
        });
      }
    }

    return Response.json(
      {
        project: {
          id: newProjId,
          name: `${src.name} (Copy)`,
          description: src.description,
          boardType: src.boardType,
          activeSnapshotId: newActiveSnapId,
          hardwareConfig: src.hardwareConfig,
          customization: src.customization,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          snapshotCount: srcSnaps.length,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/projects/[id]/duplicate]", err);
    return Response.json({ error: "Failed to duplicate project" }, { status: 500 });
  }
}
