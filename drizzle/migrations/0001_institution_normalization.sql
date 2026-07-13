DROP INDEX "institutions_country_name_unique";--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "normalized_name" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_country_normalized_name_unique" ON "institutions" USING btree ("country_code","normalized_name");