import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { firmwareFiles, firmwareSnapshots, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  getAllPersistedModules,
  getSnapshotsForProject,
  newId,
} from "@/lib/server/db-helpers";
import { analyzeFirmware } from "@/lib/simulator/analyzer/analyzer";
import type { FirmwareFileData } from "@/lib/simulator/types";

export const dynamic = "force-dynamic";

const fileInputSchema = z.object({
  path: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(160).optional(),
  content: z.string().max(1_000_000),
});

const createSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(160).optional(),
  sourceOrigin: z
    .enum(["file_import", "folder_import", "paste", "editor_save", "duplicate"])
    .optional()
    .default("file_import"),
  notes: z.string().max(1000).optional().default(""),
  files: z.array(fileInputSchema).min(1).max(100),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const snapshots = await getSnapshotsForProject(id);
    return Response.json({ snapshots });
  } catch (err) {
    console.error("[GET /api/projects/[id]/snapshots]", err);
    return Response.json({ error: "Failed to list snapshots" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const projRows = await db.select().from(projects).where(eq(projects.id, projectId));
    if (projRows.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid firmware snapshot payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Compute next version number
    const latestSnaps = await db
      .select({ versionNumber: firmwareSnapshots.versionNumber })
      .from(firmwareSnapshots)
      .where(eq(firmwareSnapshots.projectId, projectId))
      .orderBy(desc(firmwareSnapshots.versionNumber))
      .limit(1);

    const nextVersion = (latestSnaps[0]?.versionNumber ?? 0) + 1;
    const snapshotId = newId("snap");
    const now = new Date();

    const normalizedFiles: FirmwareFileData[] = parsed.data.files.map((f) => {
      const cleanPath = f.path.replace(/^\/+/, "");
      const name = f.name || cleanPath.split("/").pop() || cleanPath;
      const dotIdx = name.lastIndexOf(".");
      const extension = dotIdx >= 0 ? name.slice(dotIdx).toLowerCase() : ".ino";
      return {
        id: newId("file"),
        path: cleanPath,
        name,
        extension,
        content: f.content,
        sizeBytes: Buffer.byteLength(f.content, "utf8"),
      };
    });

    // Automatically run real AST analysis & capability report generation!
    const currentModules = await getAllPersistedModules();
    const { analysisReport, capabilityReport } = analyzeFirmware(
      normalizedFiles,
      currentModules
    );

    const label =
      parsed.data.label ||
      `v${nextVersion} — ${
        parsed.data.sourceOrigin === "paste"
          ? "Pasted Firmware"
          : parsed.data.sourceOrigin === "editor_save"
          ? "Editor Snapshot"
          : normalizedFiles[0]?.name || "Imported Firmware"
      }`;

    await db.insert(firmwareSnapshots).values({
      id: snapshotId,
      projectId,
      versionNumber: nextVersion,
      label,
      sourceOrigin: parsed.data.sourceOrigin,
      notes: parsed.data.notes,
      isReadOnly: true,
      analysisReport,
      capabilityReport,
      createdAt: now,
    });

    for (const nf of normalizedFiles) {
      await db.insert(firmwareFiles).values({
        id: nf.id,
        snapshotId,
        path: nf.path,
        name: nf.name,
        extension: nf.extension,
        content: nf.content,
        sizeBytes: nf.sizeBytes,
        createdAt: now,
      });
    }

    // Set newly imported snapshot as active
    await db
      .update(projects)
      .set({ activeSnapshotId: snapshotId, updatedAt: now })
      .where(eq(projects.id, projectId));

    return Response.json(
      {
        snapshot: {
          id: snapshotId,
          projectId,
          versionNumber: nextVersion,
          label,
          sourceOrigin: parsed.data.sourceOrigin,
          notes: parsed.data.notes,
          isReadOnly: true,
          analysisReport,
          capabilityReport,
          files: normalizedFiles,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/projects/[id]/snapshots]", err);
    return Response.json(
      { error: "Failed to import and analyse firmware snapshot" },
      { status: 500 }
    );
  }
}
