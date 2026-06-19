ALTER TABLE "clubs" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "member_since" integer;