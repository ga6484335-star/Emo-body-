CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firmware_files" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"extension" text NOT NULL,
	"content" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firmware_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"label" text NOT NULL,
	"source_origin" text DEFAULT 'file_import' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_read_only" boolean DEFAULT true NOT NULL,
	"analysis_report" jsonb,
	"capability_report" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"board_type" text DEFAULT 'ESP32 DevKit V1' NOT NULL,
	"active_snapshot_id" text,
	"hardware_config" jsonb NOT NULL,
	"customization" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulator_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"support_level" text DEFAULT 'UNSUPPORTED' NOT NULL,
	"is_extended" boolean DEFAULT false NOT NULL,
	"custom_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extension_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_test_result" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "firmware_files" ADD CONSTRAINT "firmware_files_snapshot_id_firmware_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."firmware_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firmware_snapshots" ADD CONSTRAINT "firmware_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;