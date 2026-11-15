import crypto from "crypto";
import { db } from "@/db";
import {
  appSettings,
  firmwareFiles,
  firmwareSnapshots,
  projects,
  simulatorModules,
} from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_HARDWARE_CONFIG,
  type AppSettingsData,
  type CapabilityReportEntry,
  type CustomizationConfig,
  type FirmwareAnalysisReport,
  type FirmwareFileData,
  type FirmwareSnapshotRecord,
  type HardwareConfig,
  type ModuleExtensionHistoryItem,
  type ModuleTestSuiteResult,
  type PersistedModuleState,
  type ProjectRecord,
  type SupportLevel,
} from "@/lib/simulator/types";
import { HARDWARE_MODULES } from "@/lib/simulator/modules/registry";

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function ensureSeeded(): Promise<void> {
  // Ensure all registered hardware modules exist in DB
  const existingMods = await db.select().from(simulatorModules);
  const existingIds = new Set(existingMods.map((m) => m.id));

  for (const def of HARDWARE_MODULES) {
    if (!existingIds.has(def.id)) {
      await db
        .insert(simulatorModules)
        .values({
          id: def.id,
          name: def.name,
          version: def.version,
          enabled: def.defaultEnabled,
          supportLevel: def.defaultSupportLevel,
          isExtended: false,
          customConfig: {},
          extensionHistory: [],
          lastTestResult: null,
        })
        .onConflictDoNothing();
    }
  }

  // Ensure global app settings exist
  const existingSettings = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, "global"));
  if (existingSettings.length === 0) {
    await db
      .insert(appSettings)
      .values({
        id: "global",
        settings: DEFAULT_APP_SETTINGS,
      })
      .onConflictDoNothing();
  }

  // Ensure at least one EMPTY workspace project exists (strictly no pre-programmed firmware!)
  const existingProjects = await db.select().from(projects);
  if (existingProjects.length === 0) {
    await db.insert(projects).values({
      id: newId("proj"),
      name: "EMO DevKit Workspace",
      description:
        "Empty virtual EMO robot workspace. Use IMPORT CODE to load your ESP32/Arduino firmware.",
      boardType: "ESP32 DevKit V1",
      activeSnapshotId: null,
      hardwareConfig: DEFAULT_HARDWARE_CONFIG,
      customization: DEFAULT_CUSTOMIZATION,
    });
  }
}

export async function getAllPersistedModules(): Promise<PersistedModuleState[]> {
  const rows = await db.select().from(simulatorModules);
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  return HARDWARE_MODULES.map((def) => {
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
        lastTestResult: null,
      };
    }
    return {
      id: r.id,
      name: r.name,
      version: r.version,
      enabled: r.enabled,
      supportLevel: r.supportLevel as SupportLevel,
      isExtended: r.isExtended,
      customConfig: (r.customConfig as Record<string, unknown>) ?? {},
      extensionHistory: (r.extensionHistory as ModuleExtensionHistoryItem[]) ?? [],
      lastTestResult: (r.lastTestResult as ModuleTestSuiteResult | null) ?? null,
    };
  });
}

export async function getSnapshotsForProject(projectId: string): Promise<FirmwareSnapshotRecord[]> {
  const snaps = await db
    .select()
    .from(firmwareSnapshots)
    .where(eq(firmwareSnapshots.projectId, projectId))
    .orderBy(desc(firmwareSnapshots.versionNumber));

  if (snaps.length === 0) return [];

  const snapIds = snaps.map((s) => s.id);
  const files = await db
    .select()
    .from(firmwareFiles)
    .where(inArray(firmwareFiles.snapshotId, snapIds));

  const filesBySnap = new Map<string, FirmwareFileData[]>();
  for (const f of files) {
    const arr = filesBySnap.get(f.snapshotId) ?? [];
    arr.push({
      id: f.id,
      path: f.path,
      name: f.name,
      extension: f.extension,
      content: f.content,
      sizeBytes: f.sizeBytes,
    });
    filesBySnap.set(f.snapshotId, arr);
  }

  return snaps.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    versionNumber: s.versionNumber,
    label: s.label,
    sourceOrigin: s.sourceOrigin,
    notes: s.notes,
    isReadOnly: s.isReadOnly,
    analysisReport: (s.analysisReport as FirmwareAnalysisReport | null) ?? null,
    capabilityReport: (s.capabilityReport as CapabilityReportEntry[] | null) ?? null,
    files: (filesBySnap.get(s.id) ?? []).sort((a, b) => a.path.localeCompare(b.path)),
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function getProjectsList(): Promise<ProjectRecord[]> {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  const snaps = await db.select({ projectId: firmwareSnapshots.projectId }).from(firmwareSnapshots);
  const countMap = new Map<string, number>();
  for (const s of snaps) {
    countMap.set(s.projectId, (countMap.get(s.projectId) ?? 0) + 1);
  }
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    boardType: p.boardType,
    activeSnapshotId: p.activeSnapshotId,
    hardwareConfig: p.hardwareConfig as HardwareConfig,
    customization: p.customization as CustomizationConfig,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    snapshotCount: countMap.get(p.id) ?? 0,
  }));
}

export async function getGlobalSettings(): Promise<AppSettingsData> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, "global"));
  if (rows.length === 0) return DEFAULT_APP_SETTINGS;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(rows[0].settings as Partial<AppSettingsData>),
  };
}
