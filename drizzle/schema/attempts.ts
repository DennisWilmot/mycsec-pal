import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { paperVersions, questionOptions, questions } from "./catalog";
import { profiles } from "./identity";
import { attachmentStatusEnum, attemptStatusEnum, createdAt, primaryId, updatedAt } from "./helpers";

export const attempts = pgTable(
  "attempts",
  {
    id: primaryId(),
    displayCode: varchar("display_code", { length: 20 }).notNull().unique(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    paperVersionId: uuid("paper_version_id").notNull().references(() => paperVersions.id, { onDelete: "restrict" }),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    elapsedSeconds: integer("elapsed_seconds").notNull().default(0),
    remainingSecondsAtPause: integer("remaining_seconds_at_pause"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("attempts_one_active_per_profile_unique")
      .on(table.profileId)
      .where(sql`${table.status} in ('in_progress', 'paused')`),
    index("attempts_profile_status_idx").on(table.profileId, table.status),
    index("attempts_paper_version_idx").on(table.paperVersionId),
    check("attempts_elapsed_nonnegative", sql`${table.elapsedSeconds} >= 0`),
    check("attempts_remaining_nonnegative", sql`${table.remainingSecondsAtPause} is null or ${table.remainingSecondsAtPause} >= 0`),
  ],
);

export const attemptQuestions = pgTable(
  "attempt_questions",
  {
    id: primaryId(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    questionSnapshotJson: jsonb("question_snapshot_json").notNull(),
    maxMarks: integer("max_marks").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("attempt_questions_attempt_position_unique").on(table.attemptId, table.position),
    uniqueIndex("attempt_questions_attempt_question_unique").on(table.attemptId, table.questionId),
    index("attempt_questions_question_idx").on(table.questionId),
    check("attempt_questions_values_valid", sql`${table.position} > 0 and ${table.maxMarks} >= 0`),
  ],
);

export const attemptResponses = pgTable(
  "attempt_responses",
  {
    id: primaryId(),
    attemptQuestionId: uuid("attempt_question_id").notNull().references(() => attemptQuestions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    selectedOptionId: uuid("selected_option_id").references(() => questionOptions.id, { onDelete: "set null" }),
    responseJson: jsonb("response_json").notNull().default(sql`'{}'::jsonb`),
    isFlagged: boolean("is_flagged").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    clientRevision: integer("client_revision").notNull().default(0),
    serverRevision: integer("server_revision").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("attempt_responses_attempt_question_unique").on(table.attemptQuestionId),
    index("attempt_responses_profile_idx").on(table.profileId),
    check("attempt_responses_revisions_nonnegative", sql`${table.clientRevision} >= 0 and ${table.serverRevision} >= 0`),
  ],
);

export const responseAttachments = pgTable(
  "response_attachments",
  {
    id: primaryId(),
    attemptResponseId: uuid("attempt_response_id").notNull().references(() => attemptResponses.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: attachmentStatusEnum("status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [check("response_attachments_size_positive", sql`${table.sizeBytes} > 0`)],
);

export const attemptEvents = pgTable(
  "attempt_events",
  {
    id: primaryId(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (table) => [index("attempt_events_attempt_occurred_idx").on(table.attemptId, table.occurredAt)],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: primaryId(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    operation: varchar("operation", { length: 80 }).notNull(),
    key: varchar("key", { length: 160 }).notNull(),
    responseJson: jsonb("response_json"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("idempotency_keys_profile_operation_key_unique").on(table.profileId, table.operation, table.key),
    index("idempotency_keys_expires_idx").on(table.expiresAt),
  ],
);
