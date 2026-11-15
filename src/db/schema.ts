import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  boardType: text("board_type").notNull().default("ESP32 DevKit V1"),
  activeSnapshotId: text("active_snapshot_id"),
  hardwareConfig: jsonb("hardware_config").notNull(),
  customization: jsonb("customization").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const firmwareSnapshots = pgTable("firmware_snapshots", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  label: text("label").notNull(),
  sourceOrigin: text("source_origin").notNull().default("file_import"),
  notes: text("notes").notNull().default(""),
  isReadOnly: boolean("is_read_only").notNull().default(true),
  analysisReport: jsonb("analysis_report"),
  capabilityReport: jsonb("capability_report"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const firmwareFiles = pgTable("firmware_files", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => firmwareSnapshots.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  name: text("name").notNull(),
  extension: text("extension").notNull(),
  content: text("content").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const simulatorModules = pgTable("simulator_modules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  supportLevel: text("support_level").notNull().default("UNSUPPORTED"),
  isExtended: boolean("is_extended").notNull().default(false),
  customConfig: jsonb("custom_config").notNull().default({}),
  extensionHistory: jsonb("extension_history").notNull().default([]),
  lastTestResult: jsonb("last_test_result"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey(),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
