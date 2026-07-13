ALTER TABLE "outbox_events" ADD COLUMN "dedupe_key" varchar(180) NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_dedupe_key_unique" UNIQUE("dedupe_key");