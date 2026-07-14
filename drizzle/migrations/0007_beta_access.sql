CREATE TABLE IF NOT EXISTS "promotion_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"duration_days" integer NOT NULL,
	"daily_attempt_limit" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_codes_normalized_code_check" CHECK ("promotion_codes"."code" = lower(trim("promotion_codes"."code"))),
	CONSTRAINT "promotion_codes_duration_check" CHECK ("promotion_codes"."duration_days" > 0),
	CONSTRAINT "promotion_codes_daily_limit_check" CHECK ("promotion_codes"."daily_attempt_limit" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_codes_code_unique" ON "promotion_codes" USING btree ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_code_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "promotion_redemptions_promotion_code_id_promotion_codes_id_fk" FOREIGN KEY ("promotion_code_id") REFERENCES "public"."promotion_codes"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "promotion_redemptions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_redemptions_code_profile_unique" ON "promotion_redemptions" USING btree ("promotion_code_id", "profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotion_redemptions_profile_expiry_idx" ON "promotion_redemptions" USING btree ("profile_id", "expires_at");
--> statement-breakpoint
INSERT INTO "promotion_codes" ("code", "name", "duration_days", "daily_attempt_limit", "active")
VALUES ('beta', 'MyCSECPal beta access', 14, 5, true)
ON CONFLICT ("code") DO UPDATE SET
	"name" = EXCLUDED."name",
	"duration_days" = EXCLUDED."duration_days",
	"daily_attempt_limit" = EXCLUDED."daily_attempt_limit",
	"active" = true,
	"updated_at" = now();
