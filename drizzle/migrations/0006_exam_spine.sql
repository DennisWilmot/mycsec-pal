CREATE TABLE "paper_blueprint_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"module_number" smallint NOT NULL,
	"topic_id" uuid,
	"assessment_profile" "assessment_profile" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"question_type" "question_type" NOT NULL,
	"marks" integer NOT NULL,
	"selection_group" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_blueprint_slots_position_positive" CHECK ("paper_blueprint_slots"."position" > 0 and "paper_blueprint_slots"."marks" > 0),
	CONSTRAINT "paper_blueprint_slots_module_range" CHECK ("paper_blueprint_slots"."module_number" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "paper_blueprint_slots" ADD CONSTRAINT "paper_blueprint_slots_paper_version_id_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."paper_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "paper_blueprint_slots" ADD CONSTRAINT "paper_blueprint_slots_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "paper_blueprint_slots_version_position_unique" ON "paper_blueprint_slots" USING btree ("paper_version_id","position");
--> statement-breakpoint
CREATE INDEX "paper_blueprint_slots_selection_idx" ON "paper_blueprint_slots" USING btree ("paper_version_id","module_number","assessment_profile","difficulty");
