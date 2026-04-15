ALTER TABLE "entries" ADD COLUMN "content_type" varchar(20);--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "depth" varchar(10);--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "authors" jsonb;