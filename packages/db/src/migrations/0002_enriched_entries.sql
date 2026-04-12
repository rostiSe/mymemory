CREATE TYPE "public"."review_status" AS ENUM('unreviewed', 'kept', 'dismissed', 'remind');--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "raw_content" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "readable_content" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "key_points" jsonb;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "is_favorited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "read_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "last_read_at" timestamp;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "review_status" "review_status" DEFAULT 'unreviewed' NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "source_app" varchar(255);--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "word_count" integer;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "language" varchar(10);