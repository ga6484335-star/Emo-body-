import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { projects } from "@/db/schema";
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_HARDWARE_CONFIG,
} from "@/lib/simulator/types";
import { ensureSeeded, getProjectsList, newId } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  boardType: z.string().max(80).optional().default("ESP32 DevKit V1"),
  hardwareConfig: z.record(z.string(), z.unknown()).optional(),
  customization: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    await ensureSeeded();
    const list = await getProjectsList();
    return Response.json({ projects: list });
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return Response.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid project payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const id = newId("proj");
    const now = new Date();
    const hwConfig = parsed.data.hardwareConfig ?? DEFAULT_HARDWARE_CONFIG;
    const cust = parsed.data.customization ?? DEFAULT_CUSTOMIZATION;

    await db.insert(projects).values({
      id,
      name: parsed.data.name,
      description: parsed.data.description,
      boardType: parsed.data.boardType,
      activeSnapshotId: null,
      hardwareConfig: hwConfig,
      customization: cust,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json(
      {
        project: {
          id,
          name: parsed.data.name,
          description: parsed.data.description,
          boardType: parsed.data.boardType,
          activeSnapshotId: null,
          hardwareConfig: hwConfig,
          customization: cust,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          snapshotCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return Response.json({ error: "Failed to create project" }, { status: 500 });
  }
}
