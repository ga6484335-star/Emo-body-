import { NextRequest } from "next/server";
import { db } from "@/db";
import { simulatorModules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded, getAllPersistedModules } from "@/lib/server/db-helpers";
import { HARDWARE_MODULE_MAP } from "@/lib/simulator/modules/registry";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSeeded();
    const { id: moduleId } = await context.params;
    const def = HARDWARE_MODULE_MAP.get(moduleId);
    if (!def) {
      return Response.json({ error: `Unknown simulator module '${moduleId}'` }, { status: 404 });
    }

    const testResult = def.runTests();
    await db
      .update(simulatorModules)
      .set({
        lastTestResult: testResult,
        updatedAt: new Date(),
      })
      .where(eq(simulatorModules.id, moduleId));

    const modules = await getAllPersistedModules();
    return Response.json({ testResult, modules });
  } catch (err) {
    console.error("[POST /api/modules/[id]/test]", err);
    return Response.json({ error: "Failed to run module tests" }, { status: 500 });
  }
}
