import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { attemptQuestions, attempts } from "./attempts";
import { topics } from "./catalog";
import { createdAt, markingJobStatusEnum, outboxStatusEnum, primaryId, updatedAt } from "./helpers";

export const markingJobs = pgTable(
  "marking_jobs",
  {
    id: primaryId(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    status: markingJobStatusEnum("status").notNull().default("pending"),
    provider: varchar("provider", { length: 80 }),
    model: varchar("model", { length: 160 }),
    promptVersion: varchar("prompt_version", { length: 80 }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("marking_jobs_attempt_unique").on(table.attemptId),
    index("marking_jobs_status_created_idx").on(table.status, table.createdAt),
    check("marking_jobs_attempt_count_nonnegative", sql`${table.attemptCount} >= 0`),
  ],
);

export const results = pgTable(
  "results",
  {
    id: primaryId(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    rawScore: numeric("raw_score", { precision: 8, scale: 2 }).notNull(),
    maxScore: numeric("max_score", { precision: 8, scale: 2 }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    questionsCompleted: integer("questions_completed").notNull(),
    timeUsedSeconds: integer("time_used_seconds").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("results_attempt_unique").on(table.attemptId),
    check("results_scores_valid", sql`${table.rawScore} >= 0 and ${table.maxScore} > 0 and ${table.rawScore} <= ${table.maxScore}`),
    check("results_percentage_valid", sql`${table.percentage} >= 0 and ${table.percentage} <= 100`),
    check("results_counts_valid", sql`${table.questionsCompleted} >= 0 and ${table.timeUsedSeconds} >= 0`),
  ],
);

export const questionMarks = pgTable(
  "question_marks",
  {
    id: primaryId(),
    resultId: uuid("result_id").notNull().references(() => results.id, { onDelete: "cascade" }),
    attemptQuestionId: uuid("attempt_question_id").notNull().references(() => attemptQuestions.id, { onDelete: "cascade" }),
    awardedMarks: numeric("awarded_marks", { precision: 7, scale: 2 }).notNull(),
    maxMarks: numeric("max_marks", { precision: 7, scale: 2 }).notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    feedback: text("feedback"),
    markingEvidenceJson: jsonb("marking_evidence_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("question_marks_result_question_unique").on(table.resultId, table.attemptQuestionId),
    check("question_marks_scores_valid", sql`${table.awardedMarks} >= 0 and ${table.maxMarks} >= 0 and ${table.awardedMarks} <= ${table.maxMarks}`),
  ],
);

export const attemptTopicResults = pgTable(
  "attempt_topic_results",
  {
    id: primaryId(),
    resultId: uuid("result_id").notNull().references(() => results.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "restrict" }),
    score: numeric("score", { precision: 8, scale: 2 }).notNull(),
    maxScore: numeric("max_score", { precision: 8, scale: 2 }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("attempt_topic_results_result_topic_unique").on(table.resultId, table.topicId),
    index("attempt_topic_results_topic_idx").on(table.topicId),
    check("attempt_topic_results_values_valid", sql`${table.score} >= 0 and ${table.maxScore} > 0 and ${table.score} <= ${table.maxScore} and ${table.percentage} >= 0 and ${table.percentage} <= 100 and ${table.evidenceCount} > 0`),
  ],
);

export const examinerSummaries = pgTable(
  "examiner_summaries",
  {
    id: primaryId(),
    resultId: uuid("result_id").notNull().references(() => results.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    strengthsJson: jsonb("strengths_json").notNull().default(sql`'[]'::jsonb`),
    misconceptionsJson: jsonb("misconceptions_json").notNull().default(sql`'[]'::jsonb`),
    timeObservation: text("time_observation"),
    patternsJson: jsonb("patterns_json").notNull().default(sql`'[]'::jsonb`),
    nextStepsJson: jsonb("next_steps_json").notNull().default(sql`'[]'::jsonb`),
    promptVersion: varchar("prompt_version", { length: 80 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("examiner_summaries_result_unique").on(table.resultId)],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: primaryId(),
    dedupeKey: varchar("dedupe_key", { length: 180 }).notNull().unique(),
    aggregateType: varchar("aggregate_type", { length: 80 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("outbox_events_dispatch_idx").on(table.status, table.availableAt, table.createdAt),
    index("outbox_events_aggregate_idx").on(table.aggregateType, table.aggregateId),
    check("outbox_events_attempts_nonnegative", sql`${table.attempts} >= 0`),
  ],
);
