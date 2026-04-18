CREATE TYPE "public"."space_origin" AS ENUM('user', 'agent');--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "origin" "space_origin" DEFAULT 'user' NOT NULL;