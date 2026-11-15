import { ensureSeeded, getAllPersistedModules } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const modules = await getAllPersistedModules();
    return Response.json({ modules });
  } catch (err) {
    console.error("[GET /api/modules]", err);
    return Response.json({ error: "Failed to load simulator modules" }, { status: 500 });
  }
}
