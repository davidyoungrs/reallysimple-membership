CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"job_title" text,
	"company" text,
	"note" text,
	"submitted_at" timestamp DEFAULT now(),
	"is_read" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_card_id_business_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."business_cards"("id") ON DELETE cascade ON UPDATE no action;