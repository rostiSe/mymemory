CREATE TYPE "public"."agent_log_level" AS ENUM('info', 'warn', 'error', 'action');--> statement-breakpoint
CREATE TYPE "public"."compilation_status" AS ENUM('idle', 'compiling', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wiki_page_type" AS ENUM('synthesis', 'timeline', 'comparison', 'glossary', 'index');--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"level" "agent_log_level" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"tool_name" varchar(100),
	"tool_input" jsonb,
	"tool_output" jsonb,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_wiki_pages" (
	"space_id" uuid NOT NULL,
	"wiki_page_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "space_wiki_pages_space_id_wiki_page_id_pk" PRIMARY KEY("space_id","wiki_page_id")
);
--> statement-breakpoint
CREATE TABLE "wiki_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wiki_page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"properties" jsonb NOT NULL,
	"source_entry_ids" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"page_type" "wiki_page_type" DEFAULT 'synthesis' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_entry_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "is_index" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "compilation_status" "compilation_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "last_compiled_at" timestamp;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "properties" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "space_wiki_pages" ADD CONSTRAINT "space_wiki_pages_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_wiki_pages" ADD CONSTRAINT "space_wiki_pages_wiki_page_id_wiki_pages_id_fk" FOREIGN KEY ("wiki_page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_wiki_page_id_wiki_pages_id_fk" FOREIGN KEY ("wiki_page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_logs_run" ON "agent_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "agent_logs_user_created" ON "agent_logs" USING btree ("user_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "space_wiki_pages_space" ON "space_wiki_pages" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "space_wiki_pages_page" ON "space_wiki_pages" USING btree ("wiki_page_id");--> statement-breakpoint
CREATE INDEX "wiki_page_versions_page" ON "wiki_page_versions" USING btree ("wiki_page_id","version" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_page_versions_page_version_uidx" ON "wiki_page_versions" USING btree ("wiki_page_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_pages_user_slug" ON "wiki_pages" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "wiki_pages_user_id" ON "wiki_pages" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_user_index" ON "spaces" USING btree ("user_id") WHERE "spaces"."is_index" = true;