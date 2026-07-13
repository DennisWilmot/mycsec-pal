CREATE TYPE "public"."assessment_profile" AS ENUM('conceptual_knowledge', 'algorithmic_knowledge', 'reasoning');--> statement-breakpoint
CREATE TYPE "public"."attachment_status" AS ENUM('pending', 'ready', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'paused', 'submitted', 'marking', 'marked', 'cancelled', 'expired', 'marking_failed');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'review', 'approved', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."marking_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'publishing', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."paper_type" AS ENUM('paper_1', 'paper_2');--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('student', 'teacher', 'parent');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'structured');--> statement-breakpoint
CREATE TYPE "public"."response_type" AS ENUM('option', 'working_lines', 'graph', 'short_text');--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"document_type" varchar(40) NOT NULL,
	"document_version" varchar(40) NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"institution_type" varchar(32) DEFAULT 'school' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_country_code_format" CHECK ("institutions"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"phone" varchar(32),
	"role" "profile_role" DEFAULT 'student' NOT NULL,
	"country_code" varchar(2),
	"institution_id" uuid,
	"grade_form" varchar(64),
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_country_code_format" CHECK ("profiles"."country_code" is null or "profiles"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "mark_schemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid,
	"question_part_id" uuid,
	"scheme_json" jsonb NOT NULL,
	"max_marks" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mark_schemes_exactly_one_target" CHECK (num_nonnulls("mark_schemes"."question_id", "mark_schemes"."question_part_id") = 1),
	CONSTRAINT "mark_schemes_positive_values" CHECK ("mark_schemes"."max_marks" >= 0 and "mark_schemes"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "paper_instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"key" varchar(80) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"syllabus_version_id" uuid NOT NULL,
	"blueprint_id" varchar(120) NOT NULL,
	"blueprint_version" integer NOT NULL,
	"version" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"total_marks" integer NOT NULL,
	"question_count" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_versions_positive_values" CHECK ("paper_versions"."version" > 0 and "paper_versions"."blueprint_version" > 0 and "paper_versions"."duration_seconds" > 0 and "paper_versions"."total_marks" > 0 and "paper_versions"."question_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"paper_type" "paper_type" NOT NULL,
	"title" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_subjects" (
	"profile_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_subjects_profile_id_subject_id_pk" PRIMARY KEY("profile_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" varchar(8) NOT NULL,
	"content_json" jsonb NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_part_topics" (
	"question_part_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"weight" numeric(6, 5) DEFAULT '1' NOT NULL,
	CONSTRAINT "question_part_topics_question_part_id_topic_id_pk" PRIMARY KEY("question_part_id","topic_id"),
	CONSTRAINT "question_part_topics_weight_range" CHECK ("question_part_topics"."weight" > 0 and "question_part_topics"."weight" <= 1)
);
--> statement-breakpoint
CREATE TABLE "question_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(140) NOT NULL,
	"question_id" uuid NOT NULL,
	"parent_part_id" uuid,
	"label" varchar(24) NOT NULL,
	"prompt_json" jsonb NOT NULL,
	"response_type" "response_type" NOT NULL,
	"marks" integer NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_parts_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "question_parts_marks_nonnegative" CHECK ("question_parts"."marks" >= 0)
);
--> statement-breakpoint
CREATE TABLE "question_topics" (
	"question_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"weight" numeric(6, 5) DEFAULT '1' NOT NULL,
	CONSTRAINT "question_topics_question_id_topic_id_pk" PRIMARY KEY("question_id","topic_id"),
	CONSTRAINT "question_topics_weight_range" CHECK ("question_topics"."weight" > 0 and "question_topics"."weight" <= 1)
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(120) NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"question_number" integer NOT NULL,
	"module_number" smallint NOT NULL,
	"objective_code" varchar(80) NOT NULL,
	"assessment_profile" "assessment_profile" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"type" "question_type" NOT NULL,
	"prompt_json" jsonb NOT NULL,
	"total_marks" integer NOT NULL,
	"asset_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"provenance_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "questions_marks_nonnegative" CHECK ("questions"."total_marks" >= 0),
	CONSTRAINT "questions_module_number_range" CHECK ("questions"."module_number" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"card_asset_url" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "syllabus_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"external_id" varchar(120) NOT NULL,
	"version_code" varchar(80) NOT NULL,
	"title" text NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"source_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "syllabus_versions_effective_range" CHECK ("syllabus_versions"."effective_to" is null or "syllabus_versions"."effective_from" is null or "syllabus_versions"."effective_to" > "syllabus_versions"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"syllabus_version_id" uuid NOT NULL,
	"parent_topic_id" uuid,
	"module_number" smallint NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" text NOT NULL,
	"syllabus_code" varchar(80),
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_module_number_range" CHECK ("topics"."module_number" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "attempt_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question_snapshot_json" jsonb NOT NULL,
	"max_marks" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_questions_values_valid" CHECK ("attempt_questions"."position" > 0 and "attempt_questions"."max_marks" >= 0)
);
--> statement-breakpoint
CREATE TABLE "attempt_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_question_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"response_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone,
	"client_revision" integer DEFAULT 0 NOT NULL,
	"server_revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_responses_revisions_nonnegative" CHECK ("attempt_responses"."client_revision" >= 0 and "attempt_responses"."server_revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_code" varchar(20) NOT NULL,
	"profile_id" uuid NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paused_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"elapsed_seconds" integer DEFAULT 0 NOT NULL,
	"remaining_seconds_at_pause" integer,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_display_code_unique" UNIQUE("display_code"),
	CONSTRAINT "attempts_elapsed_nonnegative" CHECK ("attempts"."elapsed_seconds" >= 0),
	CONSTRAINT "attempts_remaining_nonnegative" CHECK ("attempts"."remaining_seconds_at_pause" is null or "attempts"."remaining_seconds_at_pause" >= 0)
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"operation" varchar(80) NOT NULL,
	"key" varchar(160) NOT NULL,
	"response_json" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_response_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "attachment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "response_attachments_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "response_attachments_size_positive" CHECK ("response_attachments"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "attempt_topic_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"score" numeric(8, 2) NOT NULL,
	"max_score" numeric(8, 2) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"evidence_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_topic_results_values_valid" CHECK ("attempt_topic_results"."score" >= 0 and "attempt_topic_results"."max_score" > 0 and "attempt_topic_results"."score" <= "attempt_topic_results"."max_score" and "attempt_topic_results"."percentage" >= 0 and "attempt_topic_results"."percentage" <= 100 and "attempt_topic_results"."evidence_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "examiner_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"strengths_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"misconceptions_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"time_observation" text,
	"patterns_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_steps_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prompt_version" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marking_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"status" "marking_job_status" DEFAULT 'pending' NOT NULL,
	"provider" varchar(80),
	"model" varchar(160),
	"prompt_version" varchar(80),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marking_jobs_attempt_count_nonnegative" CHECK ("marking_jobs"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" varchar(80) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"payload_json" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_attempts_nonnegative" CHECK ("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "question_marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"attempt_question_id" uuid NOT NULL,
	"awarded_marks" numeric(7, 2) NOT NULL,
	"max_marks" numeric(7, 2) NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"feedback" text,
	"marking_evidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_marks_scores_valid" CHECK ("question_marks"."awarded_marks" >= 0 and "question_marks"."max_marks" >= 0 and "question_marks"."awarded_marks" <= "question_marks"."max_marks")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"raw_score" numeric(8, 2) NOT NULL,
	"max_score" numeric(8, 2) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"questions_completed" integer NOT NULL,
	"time_used_seconds" integer NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "results_scores_valid" CHECK ("results"."raw_score" >= 0 and "results"."max_score" > 0 and "results"."raw_score" <= "results"."max_score"),
	CONSTRAINT "results_percentage_valid" CHECK ("results"."percentage" >= 0 and "results"."percentage" <= 100),
	CONSTRAINT "results_counts_valid" CHECK ("results"."questions_completed" >= 0 and "results"."time_used_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_schemes" ADD CONSTRAINT "mark_schemes_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_schemes" ADD CONSTRAINT "mark_schemes_question_part_id_question_parts_id_fk" FOREIGN KEY ("question_part_id") REFERENCES "public"."question_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_instructions" ADD CONSTRAINT "paper_instructions_paper_version_id_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."paper_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_versions" ADD CONSTRAINT "paper_versions_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_versions" ADD CONSTRAINT "paper_versions_syllabus_version_id_syllabus_versions_id_fk" FOREIGN KEY ("syllabus_version_id") REFERENCES "public"."syllabus_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_subjects" ADD CONSTRAINT "profile_subjects_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_subjects" ADD CONSTRAINT "profile_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_part_topics" ADD CONSTRAINT "question_part_topics_question_part_id_question_parts_id_fk" FOREIGN KEY ("question_part_id") REFERENCES "public"."question_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_part_topics" ADD CONSTRAINT "question_part_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_parts" ADD CONSTRAINT "question_parts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_parts" ADD CONSTRAINT "question_parts_parent_part_id_question_parts_id_fk" FOREIGN KEY ("parent_part_id") REFERENCES "public"."question_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_paper_version_id_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."paper_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD CONSTRAINT "syllabus_versions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_syllabus_version_id_syllabus_versions_id_fk" FOREIGN KEY ("syllabus_version_id") REFERENCES "public"."syllabus_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_topic_id_topics_id_fk" FOREIGN KEY ("parent_topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_events" ADD CONSTRAINT "attempt_events_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_questions" ADD CONSTRAINT "attempt_questions_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_questions" ADD CONSTRAINT "attempt_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_attempt_question_id_attempt_questions_id_fk" FOREIGN KEY ("attempt_question_id") REFERENCES "public"."attempt_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_selected_option_id_question_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."question_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_paper_version_id_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."paper_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_attachments" ADD CONSTRAINT "response_attachments_attempt_response_id_attempt_responses_id_fk" FOREIGN KEY ("attempt_response_id") REFERENCES "public"."attempt_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_topic_results" ADD CONSTRAINT "attempt_topic_results_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_topic_results" ADD CONSTRAINT "attempt_topic_results_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examiner_summaries" ADD CONSTRAINT "examiner_summaries_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marking_jobs" ADD CONSTRAINT "marking_jobs_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_marks" ADD CONSTRAINT "question_marks_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_marks" ADD CONSTRAINT "question_marks_attempt_question_id_attempt_questions_id_fk" FOREIGN KEY ("attempt_question_id") REFERENCES "public"."attempt_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consents_profile_document_version_unique" ON "consents" USING btree ("profile_id","document_type","document_version");--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_country_name_unique" ON "institutions" USING btree ("country_code","name");--> statement-breakpoint
CREATE INDEX "profiles_institution_idx" ON "profiles" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mark_schemes_question_version_unique" ON "mark_schemes" USING btree ("question_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "mark_schemes_part_version_unique" ON "mark_schemes" USING btree ("question_part_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "paper_instructions_version_key_unique" ON "paper_instructions" USING btree ("paper_version_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "paper_versions_paper_version_unique" ON "paper_versions" USING btree ("paper_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "paper_versions_blueprint_version_unique" ON "paper_versions" USING btree ("blueprint_id","blueprint_version");--> statement-breakpoint
CREATE INDEX "paper_versions_syllabus_idx" ON "paper_versions" USING btree ("syllabus_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "papers_subject_type_unique" ON "papers" USING btree ("subject_id","paper_type");--> statement-breakpoint
CREATE INDEX "profile_subjects_profile_active_idx" ON "profile_subjects" USING btree ("profile_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_question_label_unique" ON "question_options" USING btree ("question_id","label");--> statement-breakpoint
CREATE INDEX "question_part_topics_topic_idx" ON "question_part_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_parts_question_label_unique" ON "question_parts" USING btree ("question_id","label");--> statement-breakpoint
CREATE INDEX "question_parts_question_order_idx" ON "question_parts" USING btree ("question_id","sort_order");--> statement-breakpoint
CREATE INDEX "question_topics_topic_idx" ON "question_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_version_number_unique" ON "questions" USING btree ("paper_version_id","question_number");--> statement-breakpoint
CREATE INDEX "questions_bank_selection_idx" ON "questions" USING btree ("paper_version_id","module_number","objective_code","assessment_profile","difficulty","status");--> statement-breakpoint
CREATE INDEX "questions_objective_difficulty_idx" ON "questions" USING btree ("objective_code","difficulty");--> statement-breakpoint
CREATE UNIQUE INDEX "syllabus_versions_external_id_unique" ON "syllabus_versions" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "syllabus_versions_subject_version_unique" ON "syllabus_versions" USING btree ("subject_id","version_code");--> statement-breakpoint
CREATE INDEX "syllabus_versions_subject_status_idx" ON "syllabus_versions" USING btree ("subject_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_syllabus_slug_unique" ON "topics" USING btree ("syllabus_version_id","slug");--> statement-breakpoint
CREATE INDEX "topics_subject_syllabus_idx" ON "topics" USING btree ("subject_id","syllabus_version_id");--> statement-breakpoint
CREATE INDEX "topics_parent_idx" ON "topics" USING btree ("parent_topic_id");--> statement-breakpoint
CREATE INDEX "attempt_events_attempt_occurred_idx" ON "attempt_events" USING btree ("attempt_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_questions_attempt_position_unique" ON "attempt_questions" USING btree ("attempt_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_questions_attempt_question_unique" ON "attempt_questions" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_responses_attempt_question_unique" ON "attempt_responses" USING btree ("attempt_question_id");--> statement-breakpoint
CREATE INDEX "attempt_responses_profile_idx" ON "attempt_responses" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_one_active_per_profile_unique" ON "attempts" USING btree ("profile_id") WHERE "attempts"."status" in ('in_progress', 'paused');--> statement-breakpoint
CREATE INDEX "attempts_profile_status_idx" ON "attempts" USING btree ("profile_id","status");--> statement-breakpoint
CREATE INDEX "attempts_paper_version_idx" ON "attempts" USING btree ("paper_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_profile_operation_key_unique" ON "idempotency_keys" USING btree ("profile_id","operation","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_topic_results_result_topic_unique" ON "attempt_topic_results" USING btree ("result_id","topic_id");--> statement-breakpoint
CREATE INDEX "attempt_topic_results_topic_idx" ON "attempt_topic_results" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "examiner_summaries_result_unique" ON "examiner_summaries" USING btree ("result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marking_jobs_attempt_unique" ON "marking_jobs" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "marking_jobs_status_created_idx" ON "marking_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_dispatch_idx" ON "outbox_events" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_marks_result_question_unique" ON "question_marks" USING btree ("result_id","attempt_question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_attempt_unique" ON "results" USING btree ("attempt_id");
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'institutions','profiles','subjects','syllabus_versions','topics','papers',
    'paper_versions','questions','question_parts','mark_schemes','attempts',
    'attempt_responses','response_attachments','marking_jobs','results',
    'examiner_summaries','outbox_events'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;
--> statement-breakpoint
ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "syllabus_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "papers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_instructions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_part_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mark_schemes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempt_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempt_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "response_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempt_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marking_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_marks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempt_topic_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "examiner_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "profiles_insert_own" ON "profiles" FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON "profiles" FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
--> statement-breakpoint
CREATE POLICY "consents_select_own" ON "consents" FOR SELECT TO authenticated USING ((select auth.uid()) = profile_id);
CREATE POLICY "consents_insert_own" ON "consents" FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = profile_id);
CREATE POLICY "profile_subjects_select_own" ON "profile_subjects" FOR SELECT TO authenticated USING ((select auth.uid()) = profile_id);
--> statement-breakpoint
CREATE POLICY "institutions_authenticated_read" ON "institutions" FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects_published_read" ON "subjects" FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "syllabus_versions_published_read" ON "syllabus_versions" FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "topics_published_syllabus_read" ON "topics" FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.syllabus_versions sv WHERE sv.id = syllabus_version_id AND sv.status = 'published')
);
CREATE POLICY "papers_published_read" ON "papers" FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "paper_versions_published_read" ON "paper_versions" FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "paper_instructions_published_read" ON "paper_instructions" FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.paper_versions pv WHERE pv.id = paper_version_id AND pv.status = 'published')
);
--> statement-breakpoint
CREATE POLICY "attempts_select_own" ON "attempts" FOR SELECT TO authenticated USING ((select auth.uid()) = profile_id);
CREATE POLICY "attempt_responses_select_own" ON "attempt_responses" FOR SELECT TO authenticated USING ((select auth.uid()) = profile_id);
CREATE POLICY "results_select_own_published" ON "results" FOR SELECT TO authenticated USING (
  published_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.attempts a WHERE a.id = attempt_id AND a.profile_id = (select auth.uid())
  )
);
CREATE POLICY "question_marks_select_own_published" ON "question_marks" FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.results r
    JOIN public.attempts a ON a.id = r.attempt_id
    WHERE r.id = result_id AND r.published_at IS NOT NULL AND a.profile_id = (select auth.uid())
  )
);
CREATE POLICY "attempt_topic_results_select_own_published" ON "attempt_topic_results" FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.results r
    JOIN public.attempts a ON a.id = r.attempt_id
    WHERE r.id = result_id AND r.published_at IS NOT NULL AND a.profile_id = (select auth.uid())
  )
);
CREATE POLICY "examiner_summaries_select_own_published" ON "examiner_summaries" FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.results r
    JOIN public.attempts a ON a.id = r.attempt_id
    WHERE r.id = result_id AND r.published_at IS NOT NULL AND a.profile_id = (select auth.uid())
  )
);
