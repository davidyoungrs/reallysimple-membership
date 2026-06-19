ALTER TABLE "club_admins" ALTER COLUMN "clerk_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "club_admins" ADD COLUMN "email" text;