import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { profiles } from "./identity";
import {
  assessmentProfileEnum,
  contentStatusEnum,
  createdAt,
  difficultyEnum,
  paperTypeEnum,
  primaryId,
  questionTypeEnum,
  responseTypeEnum,
  updatedAt,
} from "./helpers";

export const subjects = pgTable("subjects", {
  id: primaryId(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: text("name").notNull(),
  status: contentStatusEnum("status").notNull().default("draft"),
  cardAssetUrl: text("card_asset_url"),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const syllabusVersions = pgTable(
  "syllabus_versions",
  {
    id: primaryId(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    externalId: varchar("external_id", { length: 120 }).notNull(),
    versionCode: varchar("version_code", { length: 80 }).notNull(),
    title: text("title").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    sourceUrl: text("source_url"),
    status: contentStatusEnum("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("syllabus_versions_external_id_unique").on(table.externalId),
    uniqueIndex("syllabus_versions_subject_version_unique").on(table.subjectId, table.versionCode),
    index("syllabus_versions_subject_status_idx").on(table.subjectId, table.status),
    check(
      "syllabus_versions_effective_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
  ],
);

export const profileSubjects = pgTable(
  "profile_subjects",
  {
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    sortOrder: smallint("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.subjectId] }),
    index("profile_subjects_profile_active_idx").on(table.profileId, table.isActive),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: primaryId(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    syllabusVersionId: uuid("syllabus_version_id").notNull().references(() => syllabusVersions.id, { onDelete: "restrict" }),
    parentTopicId: uuid("parent_topic_id").references((): AnyPgColumn => topics.id, { onDelete: "set null" }),
    moduleNumber: smallint("module_number").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: text("name").notNull(),
    syllabusCode: varchar("syllabus_code", { length: 80 }),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("topics_syllabus_slug_unique").on(table.syllabusVersionId, table.slug),
    index("topics_subject_syllabus_idx").on(table.subjectId, table.syllabusVersionId),
    index("topics_parent_idx").on(table.parentTopicId),
    check("topics_module_number_range", sql`${table.moduleNumber} between 1 and 3`),
  ],
);

export const papers = pgTable(
  "papers",
  {
    id: primaryId(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    paperType: paperTypeEnum("paper_type").notNull(),
    title: text("title").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("papers_subject_type_unique").on(table.subjectId, table.paperType)],
);

export const paperVersions = pgTable(
  "paper_versions",
  {
    id: primaryId(),
    paperId: uuid("paper_id").notNull().references(() => papers.id, { onDelete: "cascade" }),
    syllabusVersionId: uuid("syllabus_version_id").notNull().references(() => syllabusVersions.id, { onDelete: "restrict" }),
    blueprintId: varchar("blueprint_id", { length: 120 }).notNull(),
    blueprintVersion: integer("blueprint_version").notNull(),
    version: integer("version").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    totalMarks: integer("total_marks").notNull(),
    questionCount: integer("question_count").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("paper_versions_paper_version_unique").on(table.paperId, table.version),
    uniqueIndex("paper_versions_blueprint_version_unique").on(table.blueprintId, table.blueprintVersion),
    index("paper_versions_syllabus_idx").on(table.syllabusVersionId),
    check("paper_versions_positive_values", sql`${table.version} > 0 and ${table.blueprintVersion} > 0 and ${table.durationSeconds} > 0 and ${table.totalMarks} > 0 and ${table.questionCount} > 0`),
  ],
);

export const paperInstructions = pgTable(
  "paper_instructions",
  {
    id: primaryId(),
    paperVersionId: uuid("paper_version_id").notNull().references(() => paperVersions.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 80 }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("paper_instructions_version_key_unique").on(table.paperVersionId, table.key)],
);

export const questions = pgTable(
  "questions",
  {
    id: primaryId(),
    externalId: varchar("external_id", { length: 120 }).notNull().unique(),
    paperVersionId: uuid("paper_version_id").notNull().references(() => paperVersions.id, { onDelete: "cascade" }),
    questionNumber: integer("question_number").notNull(),
    moduleNumber: smallint("module_number").notNull(),
    objectiveCode: varchar("objective_code", { length: 80 }).notNull(),
    assessmentProfile: assessmentProfileEnum("assessment_profile").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    type: questionTypeEnum("type").notNull(),
    promptJson: jsonb("prompt_json").notNull(),
    totalMarks: integer("total_marks").notNull(),
    assetUrl: text("asset_url"),
    status: contentStatusEnum("status").notNull().default("draft"),
    provenanceJson: jsonb("provenance_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("questions_version_number_unique").on(table.paperVersionId, table.questionNumber),
    index("questions_bank_selection_idx").on(
      table.paperVersionId,
      table.moduleNumber,
      table.objectiveCode,
      table.assessmentProfile,
      table.difficulty,
      table.status,
    ),
    index("questions_objective_difficulty_idx").on(table.objectiveCode, table.difficulty),
    check("questions_marks_nonnegative", sql`${table.totalMarks} >= 0`),
    check("questions_module_number_range", sql`${table.moduleNumber} between 1 and 3`),
  ],
);

export const questionParts = pgTable(
  "question_parts",
  {
    id: primaryId(),
    externalId: varchar("external_id", { length: 140 }).notNull().unique(),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    parentPartId: uuid("parent_part_id").references((): AnyPgColumn => questionParts.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 24 }).notNull(),
    promptJson: jsonb("prompt_json").notNull(),
    responseType: responseTypeEnum("response_type").notNull(),
    marks: integer("marks").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("question_parts_question_label_unique").on(table.questionId, table.label),
    index("question_parts_question_order_idx").on(table.questionId, table.sortOrder),
    check("question_parts_marks_nonnegative", sql`${table.marks} >= 0`),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: primaryId(),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 8 }).notNull(),
    contentJson: jsonb("content_json").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    isCorrect: boolean("is_correct").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("question_options_question_label_unique").on(table.questionId, table.label),
  ],
);

export const questionTopics = pgTable(
  "question_topics",
  {
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
    weight: numeric("weight", { precision: 6, scale: 5 }).notNull().default("1"),
  },
  (table) => [
    primaryKey({ columns: [table.questionId, table.topicId] }),
    index("question_topics_topic_idx").on(table.topicId),
    check("question_topics_weight_range", sql`${table.weight} > 0 and ${table.weight} <= 1`),
  ],
);

export const questionPartTopics = pgTable(
  "question_part_topics",
  {
    questionPartId: uuid("question_part_id").notNull().references(() => questionParts.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
    weight: numeric("weight", { precision: 6, scale: 5 }).notNull().default("1"),
  },
  (table) => [
    primaryKey({ columns: [table.questionPartId, table.topicId] }),
    index("question_part_topics_topic_idx").on(table.topicId),
    check("question_part_topics_weight_range", sql`${table.weight} > 0 and ${table.weight} <= 1`),
  ],
);

export const markSchemes = pgTable(
  "mark_schemes",
  {
    id: primaryId(),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }),
    questionPartId: uuid("question_part_id").references(() => questionParts.id, { onDelete: "cascade" }),
    schemeJson: jsonb("scheme_json").notNull(),
    maxMarks: integer("max_marks").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("mark_schemes_question_version_unique").on(table.questionId, table.version),
    uniqueIndex("mark_schemes_part_version_unique").on(table.questionPartId, table.version),
    check("mark_schemes_exactly_one_target", sql`num_nonnulls(${table.questionId}, ${table.questionPartId}) = 1`),
    check("mark_schemes_positive_values", sql`${table.maxMarks} >= 0 and ${table.version} > 0`),
  ],
);
