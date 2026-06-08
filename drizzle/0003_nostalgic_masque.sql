CREATE TABLE "club_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"clerk_id" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"branding_config" jsonb NOT NULL,
	"membership_number_format" text DEFAULT '{NUMBER}' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_uid_unique" UNIQUE("uid"),
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "membership_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"club_id" integer NOT NULL,
	"name" text NOT NULL,
	"membership_type" text NOT NULL,
	"card_config" jsonb NOT NULL,
	"duration_months" integer DEFAULT 12 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "membership_templates_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"template_id" integer NOT NULL,
	"club_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"member_email" text NOT NULL,
	"member_photo" text,
	"membership_number" text NOT NULL,
	"membership_type" text NOT NULL,
	"strip_image_url" text,
	"card_config" jsonb NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"issued_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_uid_unique" UNIQUE("uid"),
	CONSTRAINT "memberships_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wallet_push_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"device_library_identifier" text NOT NULL,
	"push_token" text NOT NULL,
	"pass_type_identifier" text NOT NULL,
	"serial_number" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_registration" UNIQUE("device_library_identifier","serial_number")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "num_cards" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" text DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_email_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "club_admins" ADD CONSTRAINT "club_admins_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_templates" ADD CONSTRAINT "membership_templates_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_template_id_membership_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."membership_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");