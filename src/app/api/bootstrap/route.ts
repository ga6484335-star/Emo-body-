import { NextRequest } from "next/server";
import {
  ensureSeeded,
  getAllPersistedModules,
  getGlobalSettings,
  getProjectsList,
  getSnapshotsForProject,
} from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const projectIdParam = req.nextUrl.searchParams.get("projectId");
    const projectsList = await getProjectsList();
    const activeProject =
      (projectIdParam ? projectsList.find((p) => p.id === projectIdParam) : null) ??
      projectsList[0] ??
      null;

    const snapshots = activeProject ? await getSnapshotsForProject(activeProject.id) : [];
    const modules = await getAllPersistedModules();
    const settings = await getGlobalSettings();

    return Response.json({
      projects: projectsList,
      activeProject,
      snapshots,
      modules,
      settings,
    });
  } catch (err) {
    console.error("[GET /api/bootstrap]", err);
    return Response.json(
      { error: "Failed to bootstrap EMO Virtual Body workspace" },
      { status: 500 }
    );
  }
}
