ALTER TABLE "space_suggestions" ADD COLUMN "suggested_space_id" uuid;--> statement-breakpoint
ALTER TABLE "space_suggestions" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "space_suggestions" ADD CONSTRAINT "space_suggestions_suggested_space_id_spaces_id_fk" FOREIGN KEY ("suggested_space_id") REFERENCES "public"."spaces"("id") ON DELETE set null ON UPDATE no action;