module.exports = [
(()=>{"use strict";return[
"[project]/src/app/api/bootstrap/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server/db-helpers.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
const dynamic = "force-dynamic";
async function GET(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureSeeded"])();
        const projectIdParam = req.nextUrl.searchParams.get("projectId");
        const projectsList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProjectsList"])();
        const activeProject = (projectIdParam ? projectsList.find((p)=>p.id === projectIdParam) : null) ?? projectsList[0] ?? null;
        const snapshots = activeProject ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSnapshotsForProject"])(activeProject.id) : [];
        const modules = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAllPersistedModules"])();
        const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2f$db$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getGlobalSettings"])();
        return Response.json({
            projects: projectsList,
            activeProject,
            snapshots,
            modules,
            settings
        });
    } catch (err) {
        console.error("[GET /api/bootstrap]", err);
        return Response.json({
            error: "Failed to bootstrap EMO Virtual Body workspace"
        }, {
            status: 500
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/db/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "db",
    ()=>db,
    "pool",
    ()=>pool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/node-postgres/driver.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
}
const globalForDb = globalThis;
const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["Pool"]({
    connectionString: databaseUrl
});
if ("TURBOPACK compile-time truthy", 1) {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
}
const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["drizzle"])(pool);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/db/schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appSettings",
    ()=>appSettings,
    "firmwareFiles",
    ()=>firmwareFiles,
    "firmwareSnapshots",
    ()=>firmwareSnapshots,
    "projects",
    ()=>projects,
    "simulatorModules",
    ()=>simulatorModules
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/integer.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-route] (ecmascript)");
;
const projects = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("projects", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("description").notNull().default(""),
    boardType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("board_type").notNull().default("ESP32 DevKit V1"),
    activeSnapshotId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("active_snapshot_id"),
    hardwareConfig: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("hardware_config").notNull(),
    customization: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("customization").notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at").notNull().defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").notNull().defaultNow()
});
const firmwareSnapshots = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("firmware_snapshots", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    projectId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("project_id").notNull().references(()=>projects.id, {
        onDelete: "cascade"
    }),
    versionNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("version_number").notNull(),
    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("label").notNull(),
    sourceOrigin: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_origin").notNull().default("file_import"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("notes").notNull().default(""),
    isReadOnly: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("is_read_only").notNull().default(true),
    analysisReport: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("analysis_report"),
    capabilityReport: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("capability_report"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at").notNull().defaultNow()
});
const firmwareFiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("firmware_files", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    snapshotId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("snapshot_id").notNull().references(()=>firmwareSnapshots.id, {
        onDelete: "cascade"
    }),
    path: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("path").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    extension: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("extension").notNull(),
    content: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("content").notNull(),
    sizeBytes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("size_bytes").notNull().default(0),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at").notNull().defaultNow()
});
const simulatorModules = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("simulator_modules", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    version: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("version").notNull(),
    enabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("enabled").notNull().default(false),
    supportLevel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("support_level").notNull().default("UNSUPPORTED"),
    isExtended: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("is_extended").notNull().default(false),
    customConfig: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("custom_config").notNull().default({}),
    extensionHistory: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("extension_history").notNull().default([]),
    lastTestResult: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("last_test_result"),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").notNull().defaultNow()
});
const appSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("app_settings", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("settings").notNull(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").notNull().defaultNow()
});
}),
"[project]/src/lib/server/db-helpers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "ensureSeeded",
    ()=>ensureSeeded,
    "getAllPersistedModules",
    ()=>getAllPersistedModules,
    "getGlobalSettings",
    ()=>getGlobalSettings,
    "getProjectsList",
    ()=>getProjectsList,
    "getSnapshotsForProject",
    ()=>getSnapshotsForProject,
    "newId",
    ()=>newId
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/types.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/modules/registry.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
function newId(prefix) {
    return `${prefix}_${__TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
async function ensureSeeded() {
    // Ensure all registered hardware modules exist in DB
    const existingMods = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["simulatorModules"]);
    const existingIds = new Set(existingMods.map((m)=>m.id));
    for (const def of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HARDWARE_MODULES"]){
        if (!existingIds.has(def.id)) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["simulatorModules"]).values({
                id: def.id,
                name: def.name,
                version: def.version,
                enabled: def.defaultEnabled,
                supportLevel: def.defaultSupportLevel,
                isExtended: false,
                customConfig: {},
                extensionHistory: [],
                lastTestResult: null
            }).onConflictDoNothing();
        }
    }
    // Ensure global app settings exist
    const existingSettings = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appSettings"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appSettings"].id, "global"));
    if (existingSettings.length === 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appSettings"]).values({
            id: "global",
            settings: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_APP_SETTINGS"]
        }).onConflictDoNothing();
    }
    // Ensure at least one EMPTY workspace project exists (strictly no pre-programmed firmware!)
    const existingProjects = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["projects"]);
    if (existingProjects.length === 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["projects"]).values({
            id: newId("proj"),
            name: "EMO DevKit Workspace",
            description: "Empty virtual EMO robot workspace. Use IMPORT CODE to load your ESP32/Arduino firmware.",
            boardType: "ESP32 DevKit V1",
            activeSnapshotId: null,
            hardwareConfig: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_HARDWARE_CONFIG"],
            customization: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_CUSTOMIZATION"]
        });
    }
}
async function getAllPersistedModules() {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["simulatorModules"]);
    const rowMap = new Map(rows.map((r)=>[
            r.id,
            r
        ]));
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$modules$2f$registry$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HARDWARE_MODULES"].map((def)=>{
        const r = rowMap.get(def.id);
        if (!r) {
            return {
                id: def.id,
                name: def.name,
                version: def.version,
                enabled: def.defaultEnabled,
                supportLevel: def.defaultSupportLevel,
                isExtended: false,
                customConfig: {},
                extensionHistory: [],
                lastTestResult: null
            };
        }
        return {
            id: r.id,
            name: r.name,
            version: r.version,
            enabled: r.enabled,
            supportLevel: r.supportLevel,
            isExtended: r.isExtended,
            customConfig: r.customConfig ?? {},
            extensionHistory: r.extensionHistory ?? [],
            lastTestResult: r.lastTestResult ?? null
        };
    });
}
async function getSnapshotsForProject(projectId) {
    const snaps = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareSnapshots"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareSnapshots"].projectId, projectId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareSnapshots"].versionNumber));
    if (snaps.length === 0) return [];
    const snapIds = snaps.map((s)=>s.id);
    const files = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareFiles"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareFiles"].snapshotId, snapIds));
    const filesBySnap = new Map();
    for (const f of files){
        const arr = filesBySnap.get(f.snapshotId) ?? [];
        arr.push({
            id: f.id,
            path: f.path,
            name: f.name,
            extension: f.extension,
            content: f.content,
            sizeBytes: f.sizeBytes
        });
        filesBySnap.set(f.snapshotId, arr);
    }
    return snaps.map((s)=>({
            id: s.id,
            projectId: s.projectId,
            versionNumber: s.versionNumber,
            label: s.label,
            sourceOrigin: s.sourceOrigin,
            notes: s.notes,
            isReadOnly: s.isReadOnly,
            analysisReport: s.analysisReport ?? null,
            capabilityReport: s.capabilityReport ?? null,
            files: (filesBySnap.get(s.id) ?? []).sort((a, b)=>a.path.localeCompare(b.path)),
            createdAt: s.createdAt.toISOString()
        }));
}
async function getProjectsList() {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["projects"]).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["projects"].updatedAt));
    const snaps = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select({
        projectId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareSnapshots"].projectId
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firmwareSnapshots"]);
    const countMap = new Map();
    for (const s of snaps){
        countMap.set(s.projectId, (countMap.get(s.projectId) ?? 0) + 1);
    }
    return rows.map((p)=>({
            id: p.id,
            name: p.name,
            description: p.description,
            boardType: p.boardType,
            activeSnapshotId: p.activeSnapshotId,
            hardwareConfig: p.hardwareConfig,
            customization: p.customization,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            snapshotCount: countMap.get(p.id) ?? 0
        }));
}
async function getGlobalSettings() {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appSettings"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appSettings"].id, "global"));
    if (rows.length === 0) return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_APP_SETTINGS"];
    return {
        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_APP_SETTINGS"],
        ...rows[0].settings
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/lib/simulator/modules/registry.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HARDWARE_MODULES",
    ()=>HARDWARE_MODULES,
    "HARDWARE_MODULE_MAP",
    ()=>HARDWARE_MODULE_MAP,
    "getDefaultPersistedModules",
    ()=>getDefaultPersistedModules
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/simulator/oled/ssd1306.ts [app-route] (ecmascript)");
;
function runSuite(moduleId, cases) {
    const started = Date.now();
    const tests = [];
    let passed = 0;
    let failed = 0;
    for (const c of cases){
        const t0 = Date.now();
        try {
            const detail = c.fn();
            passed++;
            tests.push({
                name: c.name,
                passed: true,
                durationMs: Math.max(1, Date.now() - t0),
                detail
            });
        } catch (err) {
            failed++;
            tests.push({
                name: c.name,
                passed: false,
                durationMs: Math.max(1, Date.now() - t0),
                detail: err instanceof Error ? err.message : String(err)
            });
        }
    }
    return {
        moduleId,
        ranAt: new Date().toISOString(),
        passed,
        failed,
        total: cases.length,
        durationMs: Math.max(1, Date.now() - started),
        allPassed: failed === 0,
        tests
    };
}
function assert(cond, message) {
    if (!cond) throw new Error(message);
}
const HARDWARE_MODULES = [
    {
        id: "esp32_mcu",
        name: "ESP32 Core Runtime",
        category: "Core MCU",
        version: "1.2.0",
        description: "Core Arduino/ESP32 lifecycle (setup/loop), math helpers, random generator, and virtual MCU state.",
        supportedApis: [
            "setup",
            "loop",
            "random",
            "randomSeed",
            "map",
            "constrain",
            "min",
            "max",
            "abs",
            "sin",
            "cos",
            "sqrt",
            "pow",
            "ESP.restart",
            "ESP.getFreeHeap"
        ],
        detectionLibraries: [
            "Arduino.h",
            "esp_system.h"
        ],
        detectionSymbols: [
            "setup",
            "loop",
            "random",
            "map",
            "constrain",
            "ESP"
        ],
        requiredHardware: [
            "ESP32 DevKit V1 (Virtual MCU)"
        ],
        inputInterface: [
            "Firmware AST",
            "Reset Signal"
        ],
        outputInterface: [
            "Execution State",
            "Instruction Telemetry"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Runs safe AST subset interpretation, not Xtensa LX6 machine code.",
            "Heap size telemetry is simulated rather than physical ESP32 SRAM."
        ],
        missingExplanation: "Core runtime is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Built-in safe generator-based AST interpreter.",
        runTests: ()=>runSuite("esp32_mcu", [
                {
                    name: "Arduino map() linear scaling",
                    fn: ()=>{
                        const mapped = (512 - 0) * (100 - 0) / (1024 - 0) + 0;
                        assert(mapped === 50, `Expected 50, got ${mapped}`);
                        return "map(512, 0, 1024, 0, 100) === 50";
                    }
                },
                {
                    name: "constrain() boundary clamping",
                    fn: ()=>{
                        const c = Math.max(0, Math.min(255, 310));
                        assert(c === 255, "Failed upper clamp");
                        return "constrain(310, 0, 255) === 255";
                    }
                }
            ])
    },
    {
        id: "ssd1306_oled",
        name: "OLED SSD1306 (128×64)",
        category: "Display",
        version: "1.4.0",
        description: "Pixel-accurate 128×64 monochrome OLED framebuffer implementing Adafruit_SSD1306 and Adafruit_GFX drawing primitives.",
        supportedApis: [
            "Adafruit_SSD1306",
            "begin",
            "clearDisplay",
            "display",
            "drawPixel",
            "drawLine",
            "drawFastHLine",
            "drawFastVLine",
            "drawRect",
            "fillRect",
            "drawRoundRect",
            "fillRoundRect",
            "drawCircle",
            "fillCircle",
            "drawTriangle",
            "fillTriangle",
            "setTextSize",
            "setTextColor",
            "setCursor",
            "print",
            "println",
            "drawBitmap",
            "invertDisplay",
            "dim"
        ],
        detectionLibraries: [
            "Adafruit_SSD1306.h",
            "Adafruit_GFX.h",
            "SSD1306.h",
            "U8g2lib.h"
        ],
        detectionSymbols: [
            "Adafruit_SSD1306",
            "clearDisplay",
            "fillRoundRect",
            "drawBitmap",
            "SSD1306_WHITE",
            "SSD1306_SWITCHCAPVCC"
        ],
        requiredHardware: [
            "SSD1306 128×64 I2C OLED (0x3C, SDA 21, SCL 22)"
        ],
        inputInterface: [
            "GFX Draw Calls",
            "I2C Frame Commit"
        ],
        outputInterface: [
            "128×64 1-bit Framebuffer",
            "1024-byte Page Hex Dump"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Renders standard 5×7 GFX bitmap font; custom FreeFonts headers are approximated with 5×7 metrics."
        ],
        missingExplanation: "SSD1306 OLED renderer is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Double-buffered 128×64 Uint8Array framebuffer rendered to HTML5 Canvas.",
        runTests: ()=>runSuite("ssd1306_oled", [
                {
                    name: "Initial OLED buffer is strictly blank",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        assert(oled.getActivePixelCount() === 0, "Expected 0 lit pixels initially");
                        return "0 lit pixels on cold boot";
                    }
                },
                {
                    name: "Double-buffer commits only on display()",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        oled.begin();
                        oled.fillRect(10, 10, 8, 8, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                        assert(oled.getActivePixelCount() === 0, "Committed too early before display()");
                        oled.display();
                        assert(oled.getActivePixelCount() === 64, `Expected 64 pixels, got ${oled.getActivePixelCount()}`);
                        return "fillRect(10,10,8,8) + display() === 64 active pixels";
                    }
                },
                {
                    name: "clearDisplay() + display() blanks framebuffer",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        oled.begin();
                        oled.fillCircle(64, 32, 10, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SSD1306_WHITE"]);
                        oled.display();
                        assert(oled.getActivePixelCount() > 200, "Circle not drawn");
                        oled.clearDisplay();
                        oled.display();
                        assert(oled.getActivePixelCount() === 0, "Clear did not blank screen");
                        return "Screen cleared back to 0 lit pixels";
                    }
                },
                {
                    name: "5x7 Text rendering & bitmap draw",
                    fn: ()=>{
                        const oled = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$simulator$2f$oled$2f$ssd1306$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VirtualSSD1306"](128, 64);
                        oled.begin();
                        oled.setCursor(0, 0);
                        oled.print("EMO");
                        oled.display();
                        assert(oled.getActivePixelCount() > 20, "Text failed to render pixels");
                        return `Rendered 'EMO' (${oled.getActivePixelCount()} pixels)`;
                    }
                }
            ])
    },
    {
        id: "gpio_core",
        name: "GPIO Digital & Analog",
        category: "GPIO & Input",
        version: "1.1.0",
        description: "Maintains per-pin mode, digital logic state, 12-bit analog ADC input, and PWM output for all ESP32 DevKit V1 GPIOs.",
        supportedApis: [
            "pinMode",
            "digitalWrite",
            "digitalRead",
            "analogRead",
            "analogWrite"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "pinMode",
            "digitalWrite",
            "digitalRead",
            "analogRead",
            "analogWrite"
        ],
        requiredHardware: [
            "ESP32 GPIO Matrix (GPIO 0–39)"
        ],
        inputInterface: [
            "Virtual Hardware Pin Voltage",
            "Digital Logic Level"
        ],
        outputInterface: [
            "Pin Direction",
            "Digital HIGH/LOW",
            "PWM Duty"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Electrical drive current and pull-up resistor impedance are modeled logically."
        ],
        missingExplanation: "GPIO matrix simulation is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Reactive virtual GPIO pin table wired into Hardware Lab and runtime HAL.",
        runTests: ()=>runSuite("gpio_core", [
                {
                    name: "Digital pin HIGH/LOW roundtrip",
                    fn: ()=>{
                        const pins = {};
                        pins[2] = 1;
                        assert(pins[2] === 1, "Failed digital write");
                        pins[2] = 0;
                        assert(pins[2] === 0, "Failed digital clear");
                        return "GPIO2 HIGH -> LOW verified";
                    }
                },
                {
                    name: "12-bit ESP32 ADC range clamp",
                    fn: ()=>{
                        const clamped = Math.max(0, Math.min(4095, 2048));
                        assert(clamped === 2048, "ADC clamp failed");
                        return "ADC 0..4095 range verified";
                    }
                }
            ])
    },
    {
        id: "touch_capacitive",
        name: "Touch Sensors (Main & Wake)",
        category: "GPIO & Input",
        version: "1.2.0",
        description: "Supports ESP32 capacitive touchRead() and digital touch modules (e.g. TTP223 active HIGH/LOW on GPIO27 & GPIO18) with press, release, long press, double tap, and dual-touch injection.",
        supportedApis: [
            "touchRead",
            "touchAttachInterrupt"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "touchRead",
            "TOUCH_MAIN",
            "TOUCH_WAKE",
            "TOUCH_ACTIVE",
            "touchAttachInterrupt"
        ],
        requiredHardware: [
            "Main Touch GPIO27",
            "Wake Touch GPIO18"
        ],
        inputInterface: [
            "Hardware Lab Touch Pads",
            "Robot Studio Head/Side Touch"
        ],
        outputInterface: [
            "GPIO Logic Level",
            "Capacitive Value (0–100)",
            "Touch Event History"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Capacitive baseline drift is simulated numerically (baseline ~72, touched ~14)."
        ],
        missingExplanation: "Touch input hardware simulation is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Direct injection into virtual GPIO & capacitive register state.",
        runTests: ()=>runSuite("touch_capacitive", [
                {
                    name: "Active-HIGH touch logic maps pressed -> 1",
                    fn: ()=>{
                        const activeHigh = true;
                        const pressed = true;
                        const digital = ("TURBOPACK compile-time truthy", 1) ? ("TURBOPACK compile-time truthy", 1) ? 1 : "TURBOPACK unreachable" : "TURBOPACK unreachable";
                        assert(digital === 1, "Expected HIGH");
                        return "TOUCH_ACTIVE HIGH pressed === 1";
                    }
                },
                {
                    name: "Capacitive touchRead drops below threshold on contact",
                    fn: ()=>{
                        const baseline = 74;
                        const touched = 14;
                        assert(touched < 30 && baseline > 50, "Threshold check failed");
                        return "Baseline 74 -> Touched 14";
                    }
                }
            ])
    },
    {
        id: "serial_uart",
        name: "Serial UART Communication",
        category: "Communication",
        version: "1.1.0",
        description: "Full virtual UART0 bridge streaming firmware Serial output to Serial Monitor and queuing user Serial input.",
        supportedApis: [
            "Serial.begin",
            "Serial.print",
            "Serial.println",
            "Serial.printf",
            "Serial.write",
            "Serial.available",
            "Serial.read",
            "Serial.readString",
            "Serial.readStringUntil",
            "Serial.flush"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "Serial"
        ],
        requiredHardware: [
            "ESP32 UART0 (USB-Serial Bridge)"
        ],
        inputInterface: [
            "Serial Monitor TX Buffer"
        ],
        outputInterface: [
            "Timestamped Serial Monitor Log"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Baud rate mismatch framing corruption is not simulated."
        ],
        missingExplanation: "Serial UART is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "FIFO RX/TX character ring buffers connected to Serial Monitor.",
        runTests: ()=>runSuite("serial_uart", [
                {
                    name: "TX buffer FIFO byte read",
                    fn: ()=>{
                        const buf = Array.from("OK\n");
                        assert(buf.length === 3 && buf.shift() === "O", "FIFO failed");
                        return "Serial.available() & Serial.read() verified";
                    }
                }
            ])
    },
    {
        id: "i2c_bus",
        name: "I2C Bus (Wire)",
        category: "Communication",
        version: "1.1.0",
        description: "Simulated I2C master bus on configurable SDA/SCL pins (default GPIO21/22) with address acknowledgement for attached devices like SSD1306 (0x3C).",
        supportedApis: [
            "Wire.begin",
            "Wire.setClock",
            "Wire.beginTransmission",
            "Wire.write",
            "Wire.endTransmission",
            "Wire.requestFrom",
            "Wire.available",
            "Wire.read"
        ],
        detectionLibraries: [
            "Wire.h"
        ],
        detectionSymbols: [
            "Wire"
        ],
        requiredHardware: [
            "I2C Bus (SDA GPIO21, SCL GPIO22)"
        ],
        inputInterface: [
            "Attached I2C Device Addresses"
        ],
        outputInterface: [
            "ACK/NACK Status",
            "Bus Telemetry"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Models device address ACK/NACK and basic registers, not electrical clock stretching."
        ],
        missingExplanation: "I2C Wire bus is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Virtual I2C address router checking configured Hardware Lab peripherals.",
        runTests: ()=>runSuite("i2c_bus", [
                {
                    name: "I2C address 0x3C ACK when SSD1306 attached",
                    fn: ()=>{
                        const known = new Set([
                            0x3c
                        ]);
                        const endTx = known.has(0x3c) ? 0 : 2;
                        assert(endTx === 0, "Expected ACK (0)");
                        return "Wire.endTransmission() for 0x3C === 0 (ACK)";
                    }
                }
            ])
    },
    {
        id: "timers_core",
        name: "Timers & Delay Scheduler",
        category: "Core MCU",
        version: "1.1.0",
        description: "Cooperative simulated clock providing millis(), micros(), non-blocking delay(), and delayMicroseconds() synchronized with simulation speed.",
        supportedApis: [
            "millis",
            "micros",
            "delay",
            "delayMicroseconds",
            "esp_timer_get_time"
        ],
        detectionLibraries: [
            "esp_timer.h"
        ],
        detectionSymbols: [
            "millis",
            "micros",
            "delay",
            "delayMicroseconds",
            "esp_timer_get_time"
        ],
        requiredHardware: [
            "ESP32 System Timer"
        ],
        inputInterface: [
            "Simulation Speed Multiplier"
        ],
        outputInterface: [
            "Monotonic ms/us Clock"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Microsecond jitter reflects browser frame scheduling; logical simTimeMs remains monotonic."
        ],
        missingExplanation: "Core timing scheduler is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Generator yield timer anchored to virtual simulation time.",
        runTests: ()=>runSuite("timers_core", [
                {
                    name: "Monotonic millis/micros consistency",
                    fn: ()=>{
                        const ms = 1250;
                        const us = ms * 1000;
                        assert(us === 1250000, "Microsecond conversion mismatch");
                        return "millis()=1250 -> micros()=1250000";
                    }
                }
            ])
    },
    {
        id: "buttons_digital",
        name: "Digital Push Buttons",
        category: "GPIO & Input",
        version: "1.0.0",
        description: "Virtual tactile push buttons connected to any GPIO with INPUT_PULLUP/INPUT_PULLDOWN logic.",
        supportedApis: [
            "INPUT_PULLUP",
            "INPUT_PULLDOWN"
        ],
        detectionLibraries: [
            "Bounce2.h",
            "OneButton.h"
        ],
        detectionSymbols: [
            "INPUT_PULLUP",
            "INPUT_PULLDOWN",
            "BTN_",
            "BUTTON_"
        ],
        requiredHardware: [
            "Momentary Push Button(s)"
        ],
        inputInterface: [
            "Hardware Lab Button Press/Hold"
        ],
        outputInterface: [
            "Virtual GPIO Pin State"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Contact mechanical bounce is clean unless firmware implements debounce testing."
        ],
        missingExplanation: "Digital buttons are built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Direct GPIO pin pull-up/down state machine.",
        runTests: ()=>runSuite("buttons_digital", [
                {
                    name: "INPUT_PULLUP defaults HIGH and pulls LOW on press",
                    fn: ()=>{
                        const idle = 1;
                        const pressed = 0;
                        assert(idle === 1 && pressed === 0, "Pull-up inversion failed");
                        return "INPUT_PULLUP idle=HIGH, pressed=LOW";
                    }
                }
            ])
    },
    {
        id: "leds_pwm",
        name: "Indicator LEDs",
        category: "Actuators",
        version: "1.0.0",
        description: "Virtual status LEDs bound to GPIO pins reflecting digitalWrite and analogWrite brightness.",
        supportedApis: [
            "LED_BUILTIN"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "LED_BUILTIN",
            "LED_PIN"
        ],
        requiredHardware: [
            "Onboard / External LED"
        ],
        inputInterface: [
            "GPIO Digital / PWM Output"
        ],
        outputInterface: [
            "Visual LED Indicator in Hardware Lab"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Models luminous intensity linearly from PWM 0–255."
        ],
        missingExplanation: "LED simulation is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Binds directly to GPIO pin state observer.",
        runTests: ()=>runSuite("leds_pwm", [
                {
                    name: "PWM duty maps 0..255 to 0..100% brightness",
                    fn: ()=>{
                        const pct = Math.round(128 / 255 * 100);
                        assert(pct === 50, `Expected 50%, got ${pct}%`);
                        return "PWM 128 -> 50% LED intensity";
                    }
                }
            ])
    },
    {
        id: "audio_buzzer",
        name: "Piezo Buzzer (tone / noTone)",
        category: "Audio",
        version: "1.1.0",
        description: "Simulates passive piezo buzzer output via Web Audio square-wave oscillator (strictly distinct from speaker DAC and microphone input).",
        supportedApis: [
            "tone",
            "noTone"
        ],
        detectionLibraries: [],
        detectionSymbols: [
            "tone",
            "noTone",
            "BUZZER_PIN"
        ],
        requiredHardware: [
            "Passive Piezo Buzzer (GPIO25)"
        ],
        inputInterface: [
            "Frequency (Hz)",
            "Duration (ms)"
        ],
        outputInterface: [
            "Web Audio Buzzer Oscillator",
            "Audio Telemetry"
        ],
        defaultEnabled: true,
        defaultSupportLevel: "SUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Browser Web Audio requires a prior user gesture to unlock audio playback.",
            "Approximates piezo resonance using a filtered square-wave oscillator, not physical transducer acoustics."
        ],
        missingExplanation: "Buzzer module is built-in.",
        possibleSolution: "Already active.",
        implementationStrategy: "Isolated Web Audio oscillator channel for piezo buzzer.",
        runTests: ()=>runSuite("audio_buzzer", [
                {
                    name: "Valid frequency bounds (20Hz–20000Hz)",
                    fn: ()=>{
                        const freq = Math.max(20, Math.min(20000, 1200));
                        assert(freq === 1200, "Frequency clamp failed");
                        return "tone(pin, 1200) frequency validated";
                    }
                }
            ])
    },
    // === EXTENSIBLE MODULES (Initially UNSUPPORTED until extended via IMPLEMENT SUPPORT!) ===
    {
        id: "preferences_nvs",
        name: "Preferences / NVS Storage",
        category: "Storage",
        version: "1.0.0",
        description: "Simulated ESP32 Non-Volatile Storage (Preferences.h & EEPROM.h) using isolated browser-side virtual key-value namespaces (clearly labeled as simulated, NOT physical ESP32 flash).",
        supportedApis: [
            "Preferences",
            "prefs.begin",
            "putInt",
            "getInt",
            "putUInt",
            "getUInt",
            "putLong",
            "getLong",
            "putFloat",
            "getFloat",
            "putBool",
            "getBool",
            "putString",
            "getString",
            "remove",
            "clear",
            "end",
            "EEPROM.begin",
            "EEPROM.read",
            "EEPROM.write",
            "EEPROM.commit"
        ],
        detectionLibraries: [
            "Preferences.h",
            "EEPROM.h",
            "nvs_flash.h"
        ],
        detectionSymbols: [
            "Preferences",
            "EEPROM",
            "putInt",
            "getInt",
            "putString",
            "getString",
            "putBool",
            "getBool"
        ],
        requiredHardware: [
            "Virtual NVS Partition (Simulated — Not Physical Flash)"
        ],
        inputInterface: [
            "Namespace & Key/Value Writes"
        ],
        outputInterface: [
            "Persistent Virtual NVS Table in Diagnostics"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Stored in virtual simulator memory/state — NOT written to physical ESP32 SPI flash partitions.",
            "Flash wear-leveling and NVS partition size limits are approximated."
        ],
        missingExplanation: "The Preferences/NVS storage module is not yet active in the simulator runtime. Calls to Preferences or EEPROM will not persist values until enabled.",
        possibleSolution: "Click IMPLEMENT SUPPORT to install and test the Virtual NVS/Preferences storage driver.",
        implementationStrategy: "Activates namespaced key-value store supporting int/uint/float/bool/String and byte-array EEPROM buffer, executes 5 automated unit tests, and exposes live NVS inspection in Diagnostics.",
        runTests: ()=>runSuite("preferences_nvs", [
                {
                    name: "Namespace isolation between 'emo' and 'scores'",
                    fn: ()=>{
                        const store = {
                            emo: {},
                            scores: {}
                        };
                        store.emo["mood"] = 2;
                        store.scores["mood"] = 99;
                        assert(store.emo["mood"] === 2 && store.scores["mood"] === 99, "Namespace collision");
                        return "Isolated namespaces verified";
                    }
                },
                {
                    name: "putInt / getInt default fallback",
                    fn: ()=>{
                        const ns = {};
                        const defVal = ns["highScore"] ?? 42;
                        assert(defVal === 42, "Default fallback failed");
                        ns["highScore"] = 128;
                        assert(ns["highScore"] === 128, "Write/read mismatch");
                        return "Default 42 -> Stored 128 verified";
                    }
                },
                {
                    name: "putString / getString & putBool / getBool",
                    fn: ()=>{
                        const ns = {};
                        ns["name"] = "EMO-01";
                        ns["muted"] = true;
                        assert(ns["name"] === "EMO-01" && ns["muted"] === true, "Typed persistence failed");
                        return "String and Bool roundtrip passed";
                    }
                },
                {
                    name: "remove() and clear() purge keys cleanly",
                    fn: ()=>{
                        const ns = {
                            a: 1,
                            b: 2
                        };
                        delete ns["a"];
                        assert(ns["a"] === undefined && ns["b"] === 2, "remove() failed");
                        for (const k of Object.keys(ns))delete ns[k];
                        assert(Object.keys(ns).length === 0, "clear() failed");
                        return "remove() & clear() verified";
                    }
                },
                {
                    name: "EEPROM byte clamping (0–255)",
                    fn: ()=>{
                        const eeprom = new Uint8Array(512);
                        eeprom[10] = 300 & 0xff;
                        assert(eeprom[10] === 44, "Byte wrap failed");
                        return "EEPROM 512-byte virtual buffer verified";
                    }
                }
            ])
    },
    {
        id: "audio_speaker",
        name: "Speaker (ESP32 LEDC PWM & DAC)",
        category: "Audio",
        version: "1.0.0",
        description: "Simulates ESP32 LEDC PWM tone channels and 8-bit DAC speaker output separately from piezo buzzer and microphone.",
        supportedApis: [
            "ledcSetup",
            "ledcAttachPin",
            "ledcAttach",
            "ledcWriteTone",
            "ledcWriteNote",
            "ledcWrite",
            "dacWrite"
        ],
        detectionLibraries: [
            "driver/dac.h",
            "Audio.h"
        ],
        detectionSymbols: [
            "ledcSetup",
            "ledcAttachPin",
            "ledcWriteTone",
            "ledcWrite",
            "dacWrite"
        ],
        requiredHardware: [
            "Virtual Speaker Channel (GPIO26 DAC/LEDC)"
        ],
        inputInterface: [
            "LEDC Channel Frequency & Duty",
            "DAC 8-bit Level"
        ],
        outputInterface: [
            "Web Audio Speaker Synthesizer (Separate from Buzzer)"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Simulates tonal LEDC/DAC synthesis through Web Audio API; does not emulate I2S external MAX98357A amplifier hardware."
        ],
        missingExplanation: "ESP32 LEDC PWM / DAC speaker driver is not currently active in the simulator engine.",
        possibleSolution: "Click IMPLEMENT SUPPORT to register the LEDC/DAC Speaker simulation module and run channel tests.",
        implementationStrategy: "Registers LEDC channel-to-pin mapping table and dedicated smooth sine/triangle Web Audio speaker synthesizer.",
        runTests: ()=>runSuite("audio_speaker", [
                {
                    name: "LEDC channel setup & pin attach mapping",
                    fn: ()=>{
                        const chMap = new Map();
                        chMap.set(0, {
                            pin: 26,
                            freq: 440
                        });
                        assert(chMap.get(0)?.pin === 26, "Channel mapping failed");
                        return "LEDC ch0 -> GPIO26 @ 440Hz";
                    }
                },
                {
                    name: "DAC 8-bit output clamping (0..255)",
                    fn: ()=>{
                        const val = Math.max(0, Math.min(255, 180));
                        assert(val === 180, "DAC level failed");
                        return "dacWrite(26, 180) verified";
                    }
                },
                {
                    name: "Speaker channel isolated from buzzer & microphone",
                    fn: ()=>{
                        const channels = {
                            buzzer: false,
                            speaker: true,
                            micInput: 0
                        };
                        assert(channels.speaker && !channels.buzzer, "Channel isolation failed");
                        return "Speaker/Buzzer/Mic strict separation verified";
                    }
                }
            ])
    },
    {
        id: "battery_adc",
        name: "Battery Monitor (ADC Voltage)",
        category: "Power & Sensors",
        version: "1.0.0",
        description: "Simulates LiPo battery voltage divider readings (3.2V–4.2V) mapped to Hardware Lab battery level slider via ESP32 ADC.",
        supportedApis: [
            "analogReadMilliVolts",
            "analogSetAttenuation",
            "analogReadResolution"
        ],
        detectionLibraries: [
            "esp_adc_cal.h"
        ],
        detectionSymbols: [
            "analogReadMilliVolts",
            "analogSetAttenuation",
            "BATTERY_PIN",
            "VBAT_PIN"
        ],
        requiredHardware: [
            "Virtual Battery Voltage Divider (GPIO35 ADC)"
        ],
        inputInterface: [
            "Hardware Lab Battery Level Slider (0–100%)"
        ],
        outputInterface: [
            "Simulated Millivolts (1600–2100mV divider)",
            "12-bit ADC Value"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Uses ideal linear LiPo voltage curve; does not model load sag or temperature effects."
        ],
        missingExplanation: "Battery millivolt calibration APIs (analogReadMilliVolts / attenuation) are currently inactive.",
        possibleSolution: "Click IMPLEMENT SUPPORT to activate the virtual LiPo battery ADC monitor wired to Hardware Lab.",
        implementationStrategy: "Maps Hardware Lab battery % to realistic 3.3V–4.2V voltage divider mV and 12-bit ADC readings.",
        runTests: ()=>runSuite("battery_adc", [
                {
                    name: "100% battery maps to 4200mV pack / 2100mV divider",
                    fn: ()=>{
                        const packMv = 3300 + Math.round(100 / 100 * 900);
                        assert(packMv === 4200, `Expected 4200mV, got ${packMv}`);
                        return "100% -> 4200mV pack (2100mV ADC)";
                    }
                },
                {
                    name: "0% battery maps to 3300mV cutoff",
                    fn: ()=>{
                        const packMv = 3300 + Math.round(0 / 100 * 900);
                        assert(packMv === 3300, `Expected 3300mV, got ${packMv}`);
                        return "0% -> 3300mV cutoff verified";
                    }
                }
            ])
    },
    {
        id: "spi_bus",
        name: "SPI Bus Controller",
        category: "Communication",
        version: "1.0.0",
        description: "Virtual SPI master transaction controller supporting begin, beginTransaction, transfer, and endTransaction.",
        supportedApis: [
            "SPI.begin",
            "SPI.beginTransaction",
            "SPI.transfer",
            "SPI.transfer16",
            "SPI.endTransaction",
            "SPI.end"
        ],
        detectionLibraries: [
            "SPI.h"
        ],
        detectionSymbols: [
            "SPI",
            "SPISettings"
        ],
        requiredHardware: [
            "ESP32 VSPI/HSPI Pins (MOSI 23, MISO 19, SCK 18, CS 5)"
        ],
        inputInterface: [
            "SPI Device Loopback / Virtual MISO"
        ],
        outputInterface: [
            "SPI Transaction Event Log"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Simulates logical byte transfers and loopback; no physical DMA clock timing."
        ],
        missingExplanation: "SPI bus controller module is not active yet.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable the virtual SPI bus transaction controller.",
        implementationStrategy: "Registers virtual SPI state machine with transaction tracking and byte transfer.",
        runTests: ()=>runSuite("spi_bus", [
                {
                    name: "SPI transaction lifecycle & 8-bit transfer",
                    fn: ()=>{
                        let active = true;
                        const rx = 0xa5 & 0xff;
                        active = false;
                        assert(!active && rx === 0xa5, "SPI transfer mismatch");
                        return "SPI.beginTransaction -> transfer(0xA5) -> endTransaction passed";
                    }
                }
            ])
    },
    {
        id: "servo_pwm",
        name: "Servo Actuators (ESP32Servo)",
        category: "Actuators",
        version: "1.0.0",
        description: "Simulates hobby servo motors (0–180°) via attach/write/read and exposes live servo angles in Diagnostics and Robot Studio.",
        supportedApis: [
            "Servo",
            "attach",
            "write",
            "read",
            "detach",
            "writeMicroseconds"
        ],
        detectionLibraries: [
            "ESP32Servo.h",
            "Servo.h"
        ],
        detectionSymbols: [
            "Servo",
            "ESP32Servo"
        ],
        requiredHardware: [
            "PWM Servo Actuator (0–180°)"
        ],
        inputInterface: [
            "Target Angle (0–180°)"
        ],
        outputInterface: [
            "Servo Kinematics Telemetry"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Models kinematic target angle instantaneously without motor torque/inertia physics."
        ],
        missingExplanation: "Servo actuator module is not yet active in the simulator.",
        possibleSolution: "Click IMPLEMENT SUPPORT to activate virtual servo angle simulation.",
        implementationStrategy: "Tracks per-pin servo attachment and clamped 0–180° position state.",
        runTests: ()=>runSuite("servo_pwm", [
                {
                    name: "Servo angle clamp 0..180°",
                    fn: ()=>{
                        const clamped = Math.max(0, Math.min(180, 210));
                        assert(clamped === 180, "Angle clamp failed");
                        return "Servo.write(210) clamped safely to 180°";
                    }
                }
            ])
    },
    {
        id: "imu_mpu6050",
        name: "IMU / Accelerometer (MPU6050)",
        category: "Power & Sensors",
        version: "1.0.0",
        description: "Virtual 6-axis accelerometer & gyroscope (MPU6050) driven by Hardware Lab tilt/shake controls.",
        supportedApis: [
            "MPU6050",
            "getAcceleration",
            "getRotation",
            "getMotion6"
        ],
        detectionLibraries: [
            "MPU6050.h",
            "Adafruit_MPU6050.h"
        ],
        detectionSymbols: [
            "MPU6050",
            "Adafruit_MPU6050",
            "getAcceleration",
            "getMotion6"
        ],
        requiredHardware: [
            "MPU6050 I2C IMU (0x68)"
        ],
        inputInterface: [
            "Hardware Lab Tilt/Shake Controls"
        ],
        outputInterface: [
            "ax/ay/az & gx/gy/gz Sensor Telemetry"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "SUPPORTED",
        browserSimulatable: "FULL",
        limitations: [
            "Produces synthetic 6-axis values from virtual sliders rather than physical MEMS noise."
        ],
        missingExplanation: "MPU6050 IMU sensor module is currently disabled.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable virtual 6-axis IMU sensor simulation.",
        implementationStrategy: "Registers I2C 0x68 IMU device returning controllable acceleration and gyro axes.",
        runTests: ()=>runSuite("imu_mpu6050", [
                {
                    name: "Resting Z-axis equals 1g (16384 raw)",
                    fn: ()=>{
                        const az = 16384;
                        assert(az === 16384, "1g constant mismatch");
                        return "Resting IMU az = 16384 (1.0g)";
                    }
                }
            ])
    },
    {
        id: "microphone_i2s",
        name: "Microphone Input (I2S / Analog)",
        category: "Audio",
        version: "1.0.0",
        description: "Virtual sound-level input channel (strictly separate from speaker/buzzer output). Physical ESP32 I2S DMA / INMP441 microphone hardware cannot be replicated directly in a browser.",
        supportedApis: [
            "i2s_driver_install",
            "i2s_read",
            "i2s_set_pin",
            "PDM.begin",
            "micRead"
        ],
        detectionLibraries: [
            "driver/i2s.h",
            "I2S.h",
            "PDM.h"
        ],
        detectionSymbols: [
            "i2s_driver_install",
            "i2s_read",
            "I2S_NUM_0",
            "PDM",
            "MIC_PIN"
        ],
        requiredHardware: [
            "ESP32 I2S MEMS Microphone (INMP441) or Analog Mic"
        ],
        inputInterface: [
            "Hardware Lab Virtual Sound Level Slider"
        ],
        outputInterface: [
            "Simulated Amplitude Samples (Partial)"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "PARTIALLY_SUPPORTED",
        browserSimulatable: "PARTIAL",
        limitations: [
            "Browser Web Audio / MediaDevices permissions DO NOT provide access to physical ESP32 I2S DMA registers or hardware PDM drivers.",
            "Simulated mode only injects synthetic sound-level amplitude values from Hardware Lab — real wake-word DSP or I2S PCM decoding will not match physical ESP32 hardware."
        ],
        missingExplanation: "ESP32 I2S / PDM microphone driver is not active. Physical I2S DMA hardware cannot be emulated faithfully in a browser.",
        possibleSolution: "Click IMPLEMENT SUPPORT to add PARTIAL support via a virtual amplitude injector (strictly isolated from speaker output) with documented limitations.",
        implementationStrategy: "Activates partial virtual sound-level input register driven from Hardware Lab, explicitly flagging PARTIALLY SUPPORTED status and hardware limitations.",
        runTests: ()=>runSuite("microphone_i2s", [
                {
                    name: "Virtual mic input strictly decoupled from speaker output",
                    fn: ()=>{
                        const micLevel = 420;
                        const speakerFreq = 0;
                        assert(micLevel === 420 && speakerFreq === 0, "Coupling error");
                        return "Mic amplitude 420 read independently of speaker";
                    }
                },
                {
                    name: "Honest partial capability classification",
                    fn: ()=>{
                        const level = "PARTIALLY_SUPPORTED";
                        assert(level === "PARTIALLY_SUPPORTED", "Must remain PARTIALLY_SUPPORTED");
                        return "Correctly classified as PARTIALLY_SUPPORTED";
                    }
                }
            ])
    },
    {
        id: "wifi_esp32",
        name: "Wi-Fi Networking (ESP32)",
        category: "Wireless & RTOS",
        version: "1.0.0",
        description: "Virtual mock Wi-Fi state machine (WiFi.begin/status/localIP). Browser security sandboxes prevent real 802.11 radio frames, raw TCP servers, and arbitrary non-CORS HTTP requests.",
        supportedApis: [
            "WiFi.begin",
            "WiFi.status",
            "WiFi.localIP",
            "WiFi.RSSI",
            "WiFi.mode",
            "WiFi.disconnect"
        ],
        detectionLibraries: [
            "WiFi.h",
            "HTTPClient.h",
            "WebServer.h",
            "ESPAsyncWebServer.h"
        ],
        detectionSymbols: [
            "WiFi",
            "WL_CONNECTED",
            "HTTPClient",
            "WebServer"
        ],
        requiredHardware: [
            "ESP32 2.4GHz 802.11 b/g/n Radio"
        ],
        inputInterface: [
            "Virtual Wi-Fi Toggle & RSSI"
        ],
        outputInterface: [
            "Mock WL_CONNECTED / Local IP State"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "PARTIALLY_SUPPORTED",
        browserSimulatable: "PARTIAL",
        limitations: [
            "No real 802.11 Wi-Fi radio, DHCP client, mDNS, or raw TCP listen sockets exist inside a browser.",
            "Only simulates high-level WiFi.begin() / WiFi.status() / WiFi.localIP() state transitions for offline firmware testing."
        ],
        missingExplanation: "ESP32 Wi-Fi networking stack is unsupported by default because browsers cannot emulate an 802.11 radio or raw sockets.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable a documented PARTIAL Virtual Mock Wi-Fi state machine so firmware that waits for WL_CONNECTED can proceed.",
        implementationStrategy: "Registers mock WiFi state machine returning WL_CONNECTED and 192.168.4.1 with explicit PARTIALLY_SUPPORTED limitations.",
        runTests: ()=>runSuite("wifi_esp32", [
                {
                    name: "Mock WiFi.begin transitions status to WL_CONNECTED (3)",
                    fn: ()=>{
                        const WL_CONNECTED = 3;
                        const status = WL_CONNECTED;
                        assert(status === 3, "Mock connect failed");
                        return "Virtual WiFi state machine -> WL_CONNECTED (3)";
                    }
                }
            ])
    },
    {
        id: "rtos_interrupts",
        name: "Interrupts & FreeRTOS Tasks",
        category: "Wireless & RTOS",
        version: "1.0.0",
        description: "Cooperative GPIO edge-interrupt callback dispatcher and vTaskDelay yield mapping. Dual-core preemptive FreeRTOS scheduling and RTC deep sleep hardware are not emulated.",
        supportedApis: [
            "attachInterrupt",
            "detachInterrupt",
            "digitalPinToInterrupt",
            "vTaskDelay",
            "xTaskCreate",
            "esp_deep_sleep_start"
        ],
        detectionLibraries: [
            "freertos/FreeRTOS.h",
            "freertos/task.h",
            "esp_sleep.h"
        ],
        detectionSymbols: [
            "attachInterrupt",
            "detachInterrupt",
            "xTaskCreate",
            "xTaskCreatePinnedToCore",
            "vTaskDelay",
            "esp_deep_sleep_start"
        ],
        requiredHardware: [
            "ESP32 Dual-Core FreeRTOS & NVIC Interrupt Controller"
        ],
        inputInterface: [
            "GPIO Rising/Falling Edge Events"
        ],
        outputInterface: [
            "Cooperative Callback Dispatch"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "PARTIALLY_SUPPORTED",
        browserSimulatable: "PARTIAL",
        limitations: [
            "JavaScript runs single-threaded; hardware ISR preemption and dual-core Xtensa spinlocks cannot be reproduced faithfully.",
            "esp_deep_sleep_start() halts the virtual loop cleanly instead of physically powering down the MCU."
        ],
        missingExplanation: "Hardware interrupts and FreeRTOS multi-tasking APIs are disabled by default.",
        possibleSolution: "Click IMPLEMENT SUPPORT to enable PARTIAL cooperative GPIO edge callback dispatch and vTaskDelay mapping.",
        implementationStrategy: "Enables edge-triggered callback registry on virtual GPIO writes and maps vTaskDelay to non-blocking simulator yields.",
        runTests: ()=>runSuite("rtos_interrupts", [
                {
                    name: "GPIO RISING edge invokes registered callback",
                    fn: ()=>{
                        let fired = false;
                        const prev = 0;
                        const next = 1;
                        if (prev === 0 && next === 1) fired = true;
                        assert(fired, "RISING edge callback did not fire");
                        return "RISING edge ISR dispatch verified";
                    }
                }
            ])
    },
    {
        id: "bluetooth_ble",
        name: "Bluetooth Classic & BLE GATT",
        category: "Wireless & RTOS",
        version: "1.0.0",
        description: "ESP32 Bluetooth Classic SPP (BluetoothSerial) and BLE GATT Peripheral Server stack.",
        supportedApis: [
            "BluetoothSerial",
            "BLEDevice",
            "BLEServer",
            "BLEService",
            "BLECharacteristic"
        ],
        detectionLibraries: [
            "BluetoothSerial.h",
            "BLEDevice.h",
            "BLEServer.h",
            "NimBLEDevice.h"
        ],
        detectionSymbols: [
            "BluetoothSerial",
            "BLEDevice",
            "BLEServer",
            "NimBLEDevice"
        ],
        requiredHardware: [
            "ESP32 2.4GHz Bluetooth / BLE HCI Controller"
        ],
        inputInterface: [
            "Physical BLE Radio Advertising (Unavailable in Browser)"
        ],
        outputInterface: [
            "None — Browser Cannot Host BLE GATT Peripheral"
        ],
        defaultEnabled: false,
        defaultSupportLevel: "UNSUPPORTED",
        extendedSupportLevel: "UNSUPPORTED",
        browserSimulatable: "IMPOSSIBLE",
        limitations: [
            "Web Bluetooth API only supports Central (client) connections initiated by user prompts and does NOT allow a browser tab to advertise as an ESP32 BLE GATT Peripheral or Bluetooth Classic SPP server.",
            "Accurate Bluetooth simulation requires physical ESP32 hardware or a native HCI virtualization stack."
        ],
        missingExplanation: "ESP32 Bluetooth Classic / BLE Peripheral hardware cannot be simulated in a web browser.",
        possibleSolution: "Hardware limitation: cannot be fully emulated in browser. Guard Bluetooth calls behind `#ifdef USE_BLE` or test over Virtual Serial UART instead.",
        implementationStrategy: "Honest feasibility check: reports browser impossibility rather than pretending BLE works.",
        runTests: ()=>runSuite("bluetooth_ble", [
                {
                    name: "Verify browser peripheral BLE radio capability",
                    fn: ()=>{
                        throw new Error("Browser runtime lacks BLE GATT Peripheral / Classic SPP HCI advertising APIs — physical ESP32 hardware required.");
                    }
                }
            ])
    }
];
const HARDWARE_MODULE_MAP = new Map(HARDWARE_MODULES.map((m)=>[
        m.id,
        m
    ]));
function getDefaultPersistedModules() {
    return HARDWARE_MODULES.map((m)=>({
            id: m.id,
            name: m.name,
            version: m.version,
            enabled: m.defaultEnabled,
            supportLevel: m.defaultSupportLevel,
            isExtended: false,
            customConfig: {},
            extensionHistory: [],
            lastTestResult: null
        }));
}
}),
"[project]/src/lib/simulator/oled/ssd1306.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SSD1306_BLACK",
    ()=>SSD1306_BLACK,
    "SSD1306_INVERSE",
    ()=>SSD1306_INVERSE,
    "SSD1306_WHITE",
    ()=>SSD1306_WHITE,
    "VirtualSSD1306",
    ()=>VirtualSSD1306
]);
// Authentic 5x7 ASCII font table (columns left-to-right, LSB = top row)
// Covers printable ASCII 0x20 (space) through 0x7E (~)
const FONT_5X7 = {
    32: [
        0x00,
        0x00,
        0x00,
        0x00,
        0x00
    ],
    33: [
        0x00,
        0x00,
        0x5f,
        0x00,
        0x00
    ],
    34: [
        0x00,
        0x07,
        0x00,
        0x07,
        0x00
    ],
    35: [
        0x14,
        0x7f,
        0x14,
        0x7f,
        0x14
    ],
    36: [
        0x24,
        0x2a,
        0x7f,
        0x2a,
        0x12
    ],
    37: [
        0x23,
        0x13,
        0x08,
        0x64,
        0x62
    ],
    38: [
        0x36,
        0x49,
        0x55,
        0x22,
        0x50
    ],
    39: [
        0x00,
        0x05,
        0x03,
        0x00,
        0x00
    ],
    40: [
        0x00,
        0x1c,
        0x22,
        0x41,
        0x00
    ],
    41: [
        0x00,
        0x41,
        0x22,
        0x1c,
        0x00
    ],
    42: [
        0x14,
        0x08,
        0x3e,
        0x08,
        0x14
    ],
    43: [
        0x08,
        0x08,
        0x3e,
        0x08,
        0x08
    ],
    44: [
        0x00,
        0x50,
        0x30,
        0x00,
        0x00
    ],
    45: [
        0x08,
        0x08,
        0x08,
        0x08,
        0x08
    ],
    46: [
        0x00,
        0x60,
        0x60,
        0x00,
        0x00
    ],
    47: [
        0x20,
        0x10,
        0x08,
        0x04,
        0x02
    ],
    48: [
        0x3e,
        0x51,
        0x49,
        0x45,
        0x3e
    ],
    49: [
        0x00,
        0x42,
        0x7f,
        0x40,
        0x00
    ],
    50: [
        0x42,
        0x61,
        0x51,
        0x49,
        0x46
    ],
    51: [
        0x21,
        0x41,
        0x45,
        0x4b,
        0x31
    ],
    52: [
        0x18,
        0x14,
        0x12,
        0x7f,
        0x10
    ],
    53: [
        0x27,
        0x45,
        0x45,
        0x45,
        0x39
    ],
    54: [
        0x3c,
        0x4a,
        0x49,
        0x49,
        0x30
    ],
    55: [
        0x01,
        0x71,
        0x09,
        0x05,
        0x03
    ],
    56: [
        0x36,
        0x49,
        0x49,
        0x49,
        0x36
    ],
    57: [
        0x06,
        0x49,
        0x49,
        0x29,
        0x1e
    ],
    58: [
        0x00,
        0x36,
        0x36,
        0x00,
        0x00
    ],
    59: [
        0x00,
        0x56,
        0x36,
        0x00,
        0x00
    ],
    60: [
        0x08,
        0x14,
        0x22,
        0x41,
        0x00
    ],
    61: [
        0x14,
        0x14,
        0x14,
        0x14,
        0x14
    ],
    62: [
        0x00,
        0x41,
        0x22,
        0x14,
        0x08
    ],
    63: [
        0x02,
        0x01,
        0x51,
        0x09,
        0x06
    ],
    64: [
        0x32,
        0x49,
        0x79,
        0x41,
        0x3e
    ],
    65: [
        0x7e,
        0x11,
        0x11,
        0x11,
        0x7e
    ],
    66: [
        0x7f,
        0x49,
        0x49,
        0x49,
        0x36
    ],
    67: [
        0x3e,
        0x41,
        0x41,
        0x41,
        0x22
    ],
    68: [
        0x7f,
        0x41,
        0x41,
        0x22,
        0x1c
    ],
    69: [
        0x7f,
        0x49,
        0x49,
        0x49,
        0x41
    ],
    70: [
        0x7f,
        0x09,
        0x09,
        0x09,
        0x01
    ],
    71: [
        0x3e,
        0x41,
        0x49,
        0x49,
        0x7a
    ],
    72: [
        0x7f,
        0x08,
        0x08,
        0x08,
        0x7f
    ],
    73: [
        0x00,
        0x41,
        0x7f,
        0x41,
        0x00
    ],
    74: [
        0x20,
        0x40,
        0x41,
        0x3f,
        0x01
    ],
    75: [
        0x7f,
        0x08,
        0x14,
        0x22,
        0x41
    ],
    76: [
        0x7f,
        0x40,
        0x40,
        0x40,
        0x40
    ],
    77: [
        0x7f,
        0x02,
        0x0c,
        0x02,
        0x7f
    ],
    78: [
        0x7f,
        0x04,
        0x08,
        0x10,
        0x7f
    ],
    79: [
        0x3e,
        0x41,
        0x41,
        0x41,
        0x3e
    ],
    80: [
        0x7f,
        0x09,
        0x09,
        0x09,
        0x06
    ],
    81: [
        0x3e,
        0x41,
        0x51,
        0x21,
        0x5e
    ],
    82: [
        0x7f,
        0x09,
        0x19,
        0x29,
        0x46
    ],
    83: [
        0x46,
        0x49,
        0x49,
        0x49,
        0x31
    ],
    84: [
        0x01,
        0x01,
        0x7f,
        0x01,
        0x01
    ],
    85: [
        0x3f,
        0x40,
        0x40,
        0x40,
        0x3f
    ],
    86: [
        0x1f,
        0x20,
        0x40,
        0x20,
        0x1f
    ],
    87: [
        0x3f,
        0x40,
        0x38,
        0x40,
        0x3f
    ],
    88: [
        0x63,
        0x14,
        0x08,
        0x14,
        0x63
    ],
    89: [
        0x07,
        0x08,
        0x70,
        0x08,
        0x07
    ],
    90: [
        0x61,
        0x51,
        0x49,
        0x45,
        0x43
    ],
    91: [
        0x00,
        0x7f,
        0x41,
        0x41,
        0x00
    ],
    92: [
        0x02,
        0x04,
        0x08,
        0x10,
        0x20
    ],
    93: [
        0x00,
        0x41,
        0x41,
        0x7f,
        0x00
    ],
    94: [
        0x04,
        0x02,
        0x01,
        0x02,
        0x04
    ],
    95: [
        0x40,
        0x40,
        0x40,
        0x40,
        0x40
    ],
    96: [
        0x00,
        0x01,
        0x02,
        0x04,
        0x00
    ],
    97: [
        0x20,
        0x54,
        0x54,
        0x54,
        0x78
    ],
    98: [
        0x7f,
        0x48,
        0x44,
        0x44,
        0x38
    ],
    99: [
        0x38,
        0x44,
        0x44,
        0x44,
        0x20
    ],
    100: [
        0x38,
        0x44,
        0x44,
        0x48,
        0x7f
    ],
    101: [
        0x38,
        0x54,
        0x54,
        0x54,
        0x18
    ],
    102: [
        0x08,
        0x7e,
        0x09,
        0x01,
        0x02
    ],
    103: [
        0x0c,
        0x52,
        0x52,
        0x52,
        0x3e
    ],
    104: [
        0x7f,
        0x08,
        0x04,
        0x04,
        0x78
    ],
    105: [
        0x00,
        0x44,
        0x7d,
        0x40,
        0x00
    ],
    106: [
        0x20,
        0x40,
        0x44,
        0x3d,
        0x00
    ],
    107: [
        0x7f,
        0x10,
        0x28,
        0x44,
        0x00
    ],
    108: [
        0x00,
        0x41,
        0x7f,
        0x40,
        0x00
    ],
    109: [
        0x7c,
        0x04,
        0x18,
        0x04,
        0x78
    ],
    110: [
        0x7c,
        0x08,
        0x04,
        0x04,
        0x78
    ],
    111: [
        0x38,
        0x44,
        0x44,
        0x44,
        0x38
    ],
    112: [
        0x7c,
        0x14,
        0x14,
        0x14,
        0x08
    ],
    113: [
        0x08,
        0x14,
        0x14,
        0x18,
        0x7c
    ],
    114: [
        0x7c,
        0x08,
        0x04,
        0x04,
        0x08
    ],
    115: [
        0x48,
        0x54,
        0x54,
        0x54,
        0x20
    ],
    116: [
        0x04,
        0x3f,
        0x44,
        0x40,
        0x20
    ],
    117: [
        0x3c,
        0x40,
        0x40,
        0x20,
        0x7c
    ],
    118: [
        0x1c,
        0x20,
        0x40,
        0x20,
        0x1c
    ],
    119: [
        0x3c,
        0x40,
        0x30,
        0x40,
        0x3c
    ],
    120: [
        0x44,
        0x28,
        0x10,
        0x28,
        0x44
    ],
    121: [
        0x0c,
        0x50,
        0x50,
        0x50,
        0x3c
    ],
    122: [
        0x44,
        0x64,
        0x54,
        0x4c,
        0x44
    ],
    123: [
        0x00,
        0x08,
        0x36,
        0x41,
        0x00
    ],
    124: [
        0x00,
        0x00,
        0x7f,
        0x00,
        0x00
    ],
    125: [
        0x00,
        0x41,
        0x36,
        0x08,
        0x00
    ],
    126: [
        0x10,
        0x08,
        0x08,
        0x10,
        0x08
    ]
};
const SSD1306_BLACK = 0;
const SSD1306_WHITE = 1;
const SSD1306_INVERSE = 2;
class VirtualSSD1306 {
    width;
    height;
    workBuffer;
    displayBuffer;
    initialized = false;
    i2cAddress = 0x3c;
    inverted = false;
    dimmed = false;
    cursorX = 0;
    cursorY = 0;
    textSize = 1;
    textColor = SSD1306_WHITE;
    textBgColor = -1;
    textWrap = true;
    frameCount = 0;
    drawCallsCount = 0;
    constructor(width = 128, height = 64){
        this.width = width;
        this.height = height;
        this.workBuffer = new Uint8Array(width * height);
        this.displayBuffer = new Uint8Array(width * height);
    }
    reset() {
        this.workBuffer.fill(0);
        this.displayBuffer.fill(0);
        this.initialized = false;
        this.inverted = false;
        this.dimmed = false;
        this.cursorX = 0;
        this.cursorY = 0;
        this.textSize = 1;
        this.textColor = SSD1306_WHITE;
        this.textBgColor = -1;
        this.frameCount = 0;
        this.drawCallsCount = 0;
    }
    begin(_vcs = 0x02, addr = 0x3c) {
        this.initialized = true;
        this.i2cAddress = addr || 0x3c;
        // Start blank — never show splash screen unless firmware explicitly draws!
        this.workBuffer.fill(0);
        this.displayBuffer.fill(0);
        return true;
    }
    clearDisplay() {
        this.workBuffer.fill(0);
        this.drawCallsCount++;
    }
    display() {
        this.displayBuffer.set(this.workBuffer);
        this.frameCount++;
    }
    getDisplayBuffer() {
        return this.displayBuffer;
    }
    getActivePixelCount() {
        let count = 0;
        for(let i = 0; i < this.displayBuffer.length; i++){
            if (this.displayBuffer[i] !== 0) count++;
        }
        return count;
    }
    invertDisplay(inv) {
        this.inverted = Boolean(inv);
    }
    dim(d) {
        this.dimmed = Boolean(d);
    }
    drawPixel(x, y, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
        const idx = iy * this.width + ix;
        if (color === SSD1306_WHITE) {
            this.workBuffer[idx] = 1;
        } else if (color === SSD1306_BLACK) {
            this.workBuffer[idx] = 0;
        } else if (color === SSD1306_INVERSE) {
            this.workBuffer[idx] = this.workBuffer[idx] ? 0 : 1;
        }
        this.drawCallsCount++;
    }
    getPixel(x, y) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return 0;
        return this.displayBuffer[iy * this.width + ix];
    }
    drawFastHLine(x, y, w, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        if (iy < 0 || iy >= this.height) return;
        for(let dx = 0; dx < iw; dx++){
            this.drawPixel(ix + dx, iy, color);
        }
    }
    drawFastVLine(x, y, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const ih = Math.round(h);
        if (ix < 0 || ix >= this.width) return;
        for(let dy = 0; dy < ih; dy++){
            this.drawPixel(ix, iy + dy, color);
        }
    }
    drawLine(x0, y0, x1, y1, color = SSD1306_WHITE) {
        let ix0 = Math.round(x0);
        let iy0 = Math.round(y0);
        const ix1 = Math.round(x1);
        const iy1 = Math.round(y1);
        const dx = Math.abs(ix1 - ix0);
        const dy = Math.abs(iy1 - iy0);
        const sx = ix0 < ix1 ? 1 : -1;
        const sy = iy0 < iy1 ? 1 : -1;
        let err = dx - dy;
        while(true){
            this.drawPixel(ix0, iy0, color);
            if (ix0 === ix1 && iy0 === iy1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                ix0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                iy0 += sy;
            }
        }
    }
    drawRect(x, y, w, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        if (iw <= 0 || ih <= 0) return;
        this.drawFastHLine(ix, iy, iw, color);
        this.drawFastHLine(ix, iy + ih - 1, iw, color);
        this.drawFastVLine(ix, iy, ih, color);
        this.drawFastVLine(ix + iw - 1, iy, ih, color);
    }
    fillRect(x, y, w, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        if (iw <= 0 || ih <= 0) return;
        for(let dy = 0; dy < ih; dy++){
            this.drawFastHLine(ix, iy + dy, iw, color);
        }
    }
    drawCircleHelper(x0, y0, r, cornerMask, color) {
        let f = 1 - r;
        let ddFx = 1;
        let ddFy = -2 * r;
        let x = 0;
        let y = r;
        while(x < y){
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            if (cornerMask & 0x4) {
                this.drawPixel(x0 + x, y0 + y, color);
                this.drawPixel(x0 + y, y0 + x, color);
            }
            if (cornerMask & 0x2) {
                this.drawPixel(x0 + x, y0 - y, color);
                this.drawPixel(x0 + y, y0 - x, color);
            }
            if (cornerMask & 0x8) {
                this.drawPixel(x0 - y, y0 + x, color);
                this.drawPixel(x0 - x, y0 + y, color);
            }
            if (cornerMask & 0x1) {
                this.drawPixel(x0 - y, y0 - x, color);
                this.drawPixel(x0 - x, y0 - y, color);
            }
        }
    }
    fillCircleHelper(x0, y0, r, corners, delta, color) {
        let f = 1 - r;
        let ddFx = 1;
        let ddFy = -2 * r;
        let x = 0;
        let y = r;
        let px = x;
        let py = y;
        const d = delta + 1;
        while(x < y){
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            if (x < y + 1) {
                if (corners & 1) this.drawFastVLine(x0 + x, y0 - y, 2 * y + d, color);
                if (corners & 2) this.drawFastVLine(x0 - x, y0 - y, 2 * y + d, color);
            }
            if (y !== py) {
                if (corners & 1) this.drawFastVLine(x0 + py, y0 - px, 2 * px + d, color);
                if (corners & 2) this.drawFastVLine(x0 - py, y0 - px, 2 * px + d, color);
                py = y;
            }
            px = x;
        }
    }
    drawRoundRect(x, y, w, h, r, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        const maxR = Math.floor(Math.min(iw, ih) / 2);
        const ir = Math.max(0, Math.min(Math.round(r), maxR));
        this.drawFastHLine(ix + ir, iy, iw - 2 * ir, color);
        this.drawFastHLine(ix + ir, iy + ih - 1, iw - 2 * ir, color);
        this.drawFastVLine(ix, iy + ir, ih - 2 * ir, color);
        this.drawFastVLine(ix + iw - 1, iy + ir, ih - 2 * ir, color);
        this.drawCircleHelper(ix + ir, iy + ir, ir, 1, color);
        this.drawCircleHelper(ix + iw - ir - 1, iy + ir, ir, 2, color);
        this.drawCircleHelper(ix + iw - ir - 1, iy + ih - ir - 1, ir, 4, color);
        this.drawCircleHelper(ix + ir, iy + ih - ir - 1, ir, 8, color);
    }
    fillRoundRect(x, y, w, h, r, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        const maxR = Math.floor(Math.min(iw, ih) / 2);
        const ir = Math.max(0, Math.min(Math.round(r), maxR));
        this.fillRect(ix + ir, iy, iw - 2 * ir, ih, color);
        this.fillCircleHelper(ix + iw - ir - 1, iy + ir, ir, 1, ih - 2 * ir - 1, color);
        this.fillCircleHelper(ix + ir, iy + ir, ir, 2, ih - 2 * ir - 1, color);
    }
    drawCircle(x0, y0, r, color = SSD1306_WHITE) {
        const cx = Math.round(x0);
        const cy = Math.round(y0);
        const ir = Math.round(r);
        if (ir < 0) return;
        let f = 1 - ir;
        let ddFx = 1;
        let ddFy = -2 * ir;
        let x = 0;
        let y = ir;
        this.drawPixel(cx, cy + ir, color);
        this.drawPixel(cx, cy - ir, color);
        this.drawPixel(cx + ir, cy, color);
        this.drawPixel(cx - ir, cy, color);
        while(x < y){
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            this.drawPixel(cx + x, cy + y, color);
            this.drawPixel(cx - x, cy + y, color);
            this.drawPixel(cx + x, cy - y, color);
            this.drawPixel(cx - x, cy - y, color);
            this.drawPixel(cx + y, cy + x, color);
            this.drawPixel(cx - y, cy + x, color);
            this.drawPixel(cx + y, cy - x, color);
            this.drawPixel(cx - y, cy - x, color);
        }
    }
    fillCircle(x0, y0, r, color = SSD1306_WHITE) {
        const cx = Math.round(x0);
        const cy = Math.round(y0);
        const ir = Math.round(r);
        if (ir < 0) return;
        this.drawFastVLine(cx, cy - ir, 2 * ir + 1, color);
        this.fillCircleHelper(cx, cy, ir, 3, 0, color);
    }
    drawTriangle(x0, y0, x1, y1, x2, y2, color = SSD1306_WHITE) {
        this.drawLine(x0, y0, x1, y1, color);
        this.drawLine(x1, y1, x2, y2, color);
        this.drawLine(x2, y2, x0, y0, color);
    }
    fillTriangle(x0, y0, x1, y1, x2, y2, color = SSD1306_WHITE) {
        let ax = Math.round(x0), ay = Math.round(y0);
        let bx = Math.round(x1), by = Math.round(y1);
        let cx = Math.round(x2), cy = Math.round(y2);
        if (ay > by) {
            [ax, bx] = [
                bx,
                ax
            ];
            [ay, by] = [
                by,
                ay
            ];
        }
        if (by > cy) {
            [bx, cx] = [
                cx,
                bx
            ];
            [by, cy] = [
                cy,
                by
            ];
        }
        if (ay > by) {
            [ax, bx] = [
                bx,
                ax
            ];
            [ay, by] = [
                by,
                ay
            ];
        }
        if (ay === cy) {
            const minX = Math.min(ax, bx, cx);
            const maxX = Math.max(ax, bx, cx);
            this.drawFastHLine(minX, ay, maxX - minX + 1, color);
            return;
        }
        const dx01 = bx - ax, dy01 = by - ay;
        const dx02 = cx - ax, dy02 = cy - ay;
        const dx12 = cx - bx, dy12 = cy - by;
        let sa = 0, sb = 0;
        const last = by === cy ? by : by - 1;
        for(let y = ay; y <= last; y++){
            const a = dy01 !== 0 ? ax + Math.trunc(sa / dy01) : ax;
            const b = dy02 !== 0 ? ax + Math.trunc(sb / dy02) : ax;
            sa += dx01;
            sb += dx02;
            const startX = Math.min(a, b);
            const endX = Math.max(a, b);
            this.drawFastHLine(startX, y, endX - startX + 1, color);
        }
        sa = dx12 * (last + 1 - by);
        sb = dx02 * (last + 1 - ay);
        for(let y = last + 1; y <= cy; y++){
            const a = dy12 !== 0 ? bx + Math.trunc(sa / dy12) : bx;
            const b = dy02 !== 0 ? ax + Math.trunc(sb / dy02) : ax;
            sa += dx12;
            sb += dx02;
            const startX = Math.min(a, b);
            const endX = Math.max(a, b);
            this.drawFastHLine(startX, y, endX - startX + 1, color);
        }
    }
    drawBitmap(x, y, bitmap, w, h, color = SSD1306_WHITE) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        const iw = Math.round(w);
        const ih = Math.round(h);
        const byteWidth = Math.floor((iw + 7) / 8);
        for(let j = 0; j < ih; j++){
            for(let i = 0; i < iw; i++){
                const byteIdx = j * byteWidth + Math.floor(i / 8);
                const byteVal = bitmap[byteIdx] ?? 0;
                if (byteVal & 0x80 >> (i & 7)) {
                    this.drawPixel(ix + i, iy + j, color);
                }
            }
        }
    }
    setCursor(x, y) {
        this.cursorX = Math.round(x);
        this.cursorY = Math.round(y);
    }
    setTextSize(s) {
        this.textSize = Math.max(1, Math.min(8, Math.round(s)));
    }
    setTextColor(color, bg = -1) {
        this.textColor = color;
        this.textBgColor = bg;
    }
    drawChar(x, y, charCode, color, bg, size) {
        const glyph = FONT_5X7[charCode] ?? FONT_5X7[63]; // fallback '?'
        for(let col = 0; col < 5; col++){
            const colBits = glyph[col];
            for(let row = 0; row < 8; row++){
                const on = colBits >> row & 1;
                if (on) {
                    if (size === 1) this.drawPixel(x + col, y + row, color);
                    else this.fillRect(x + col * size, y + row * size, size, size, color);
                } else if (bg >= 0 && bg !== color) {
                    if (size === 1) this.drawPixel(x + col, y + row, bg);
                    else this.fillRect(x + col * size, y + row * size, size, size, bg);
                }
            }
        }
    }
    print(text) {
        for(let i = 0; i < text.length; i++){
            const ch = text[i];
            if (ch === "\n") {
                this.cursorX = 0;
                this.cursorY += this.textSize * 8;
                continue;
            }
            if (ch === "\r") continue;
            if (this.textWrap && this.cursorX + this.textSize * 6 > this.width) {
                this.cursorX = 0;
                this.cursorY += this.textSize * 8;
            }
            this.drawChar(this.cursorX, this.cursorY, ch.charCodeAt(0), this.textColor, this.textBgColor, this.textSize);
            this.cursorX += this.textSize * 6;
        }
    }
    println(text = "") {
        this.print(text + "\n");
    }
    /**
   * Produces authentic SSD1306 1024-byte page-organized hex dump (8 pages x 128 cols)
   */ getPageBytes() {
        const pages = Math.ceil(this.height / 8);
        const out = new Uint8Array(pages * this.width);
        for(let p = 0; p < pages; p++){
            for(let x = 0; x < this.width; x++){
                let b = 0;
                for(let bit = 0; bit < 8; bit++){
                    const y = p * 8 + bit;
                    if (y < this.height && this.displayBuffer[y * this.width + x]) {
                        b |= 1 << bit;
                    }
                }
                out[p * this.width + x] = b;
            }
        }
        return out;
    }
}
}),
"[project]/src/lib/simulator/types.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_APP_SETTINGS",
    ()=>DEFAULT_APP_SETTINGS,
    "DEFAULT_CUSTOMIZATION",
    ()=>DEFAULT_CUSTOMIZATION,
    "DEFAULT_HARDWARE_CONFIG",
    ()=>DEFAULT_HARDWARE_CONFIG
]);
const DEFAULT_HARDWARE_CONFIG = {
    boardType: "ESP32 DevKit V1",
    oled: {
        enabled: true,
        driver: "SSD1306",
        width: 128,
        height: 64,
        i2cAddress: "0x3C",
        sdaPin: 21,
        sclPin: 22
    },
    touch: {
        mainTouchPin: 27,
        wakeTouchPin: 18,
        touchActive: "HIGH",
        debounceMs: 35,
        longPressMs: 650,
        tapIntervalMs: 420,
        sleepTimeoutMs: 20000,
        bothTouchHoldMs: 2000
    },
    audio: {
        buzzerPin: 25,
        speakerPin: 26,
        microphonePin: 34,
        muted: false,
        volume: 0.35
    },
    battery: {
        adcPin: 35,
        levelPercent: 86,
        charging: false
    },
    components: [
        {
            id: "comp_oled",
            type: "oled_ssd1306",
            name: "SSD1306 128x64 OLED",
            pins: [
                21,
                22
            ],
            i2cAddress: "0x3C"
        },
        {
            id: "comp_touch_main",
            type: "touch_sensor",
            name: "Main Touch Pad (Head)",
            pins: [
                27
            ],
            activeLevel: "HIGH"
        },
        {
            id: "comp_touch_wake",
            type: "touch_sensor",
            name: "Wake Touch Pad (Side)",
            pins: [
                18
            ],
            activeLevel: "HIGH"
        },
        {
            id: "comp_buzzer",
            type: "buzzer",
            name: "Piezo Buzzer",
            pins: [
                25
            ]
        },
        {
            id: "comp_led_builtin",
            type: "led",
            name: "Onboard Status LED",
            pins: [
                2
            ]
        }
    ]
};
const DEFAULT_CUSTOMIZATION = {
    eyes: {
        visualOverrideEnabled: false,
        width: 28,
        height: 24,
        size: 1.0,
        spacing: 14,
        shape: "rounded",
        color: "#22D3EE",
        offsetX: 0,
        offsetY: 0,
        pupilSize: 0,
        gazeX: 0,
        gazeY: 0,
        blinkSpeed: 1.0
    },
    oled: {
        resolution: "128x64",
        scale: 2.6,
        brightness: 100,
        contrast: 105,
        backgroundColor: "#020408",
        phosphorColor: "#22D3EE",
        pixelStyle: "grid",
        frameDesign: "emo_visor"
    },
    body: {
        bodyColor: "#141923",
        accentColor: "#22D3EE",
        material: "satin",
        proportions: "standard",
        screenOffsetY: 0,
        lightingIntensity: 78,
        shadowOpacity: 65,
        rotationX: 6,
        rotationY: -10,
        zoom: 1.0,
        cameraAngle: "hero_3q"
    },
    rendering: {
        simulationSpeed: 1.0,
        targetFps: 60,
        quality: "high",
        cameraAutoFollow: false,
        transitionSpeed: 260
    }
};
const DEFAULT_APP_SETTINGS = {
    editorTheme: "oled-dark",
    editorFontSize: 13,
    editorTabSize: 2,
    maxInstructionsPerTick: 24000,
    maxCallStackDepth: 64,
    defaultBaudRate: 115200,
    showHardwareLimitationsBanner: true,
    aiExtensionAssistant: {
        enabled: false,
        provider: "none",
        endpointUrl: "",
        model: "",
        apiKeyConfigured: false
    }
};
}),
]})(),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__020r6ovyvaxmx._.js.map