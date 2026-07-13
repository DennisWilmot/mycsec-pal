CREATE TABLE IF NOT EXISTS "billing_customers" (
  "profile_id" uuid PRIMARY KEY REFERENCES "profiles"("id") ON DELETE CASCADE,
  "stripe_customer_id" varchar(120) NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "stripe_subscription_id" varchar(120) NOT NULL UNIQUE, "stripe_price_id" varchar(120), "status" varchar(40) NOT NULL,
  "current_period_end" timestamptz, "cancel_at_period_end" text NOT NULL DEFAULT 'false',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "subscriptions_profile_status_idx" ON "subscriptions"("profile_id","status");
CREATE TABLE IF NOT EXISTS "billing_events" (
  "stripe_event_id" varchar(160) PRIMARY KEY, "event_type" varchar(100) NOT NULL,
  "payload_json" text NOT NULL, "processed_at" timestamptz NOT NULL DEFAULT now()
);
