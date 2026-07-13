import { sql } from "drizzle-orm";
import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const profileRoleEnum = pgEnum("profile_role", ["student", "teacher", "parent"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "review", "approved", "published", "retired"]);
export const paperTypeEnum = pgEnum("paper_type", ["paper_1", "paper_2"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "structured"]);
export const responseTypeEnum = pgEnum("response_type", ["option", "working_lines", "graph", "short_text"]);
export const assessmentProfileEnum = pgEnum("assessment_profile", [
  "conceptual_knowledge",
  "algorithmic_knowledge",
  "reasoning",
]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const attemptStatusEnum = pgEnum("attempt_status", [
  "in_progress",
  "paused",
  "submitted",
  "marking",
  "marked",
  "cancelled",
  "expired",
  "marking_failed",
]);
export const markingJobStatusEnum = pgEnum("marking_job_status", ["pending", "processing", "completed", "failed"]);
export const attachmentStatusEnum = pgEnum("attachment_status", ["pending", "ready", "rejected"]);
export const outboxStatusEnum = pgEnum("outbox_status", ["pending", "publishing", "published", "failed"]);

export const primaryId = () => uuid("id").primaryKey().defaultRandom();
export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
export const nonNegative = (column: { name: string }) => sql`${column} >= 0`;
