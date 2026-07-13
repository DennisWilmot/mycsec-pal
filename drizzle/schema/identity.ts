import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { createdAt, primaryId, profileRoleEnum, updatedAt } from "./helpers";

export const institutions = pgTable(
  "institutions",
  {
    id: primaryId(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    institutionType: varchar("institution_type", { length: 32 }).notNull().default("school"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("institutions_country_normalized_name_unique").on(table.countryCode, table.normalizedName),
    check("institutions_country_code_format", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    // This UUID is the Supabase Auth user id. The auth.users FK is added in the
    // reviewed SQL migration because auth is a Supabase-managed schema.
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    phone: varchar("phone", { length: 32 }),
    role: profileRoleEnum("role").notNull().default("student"),
    countryCode: varchar("country_code", { length: 2 }),
    institutionId: uuid("institution_id").references(() => institutions.id, { onDelete: "set null" }),
    gradeForm: varchar("grade_form", { length: 64 }),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("profiles_institution_idx").on(table.institutionId),
    check("profiles_country_code_format", sql`${table.countryCode} is null or ${table.countryCode} ~ '^[A-Z]{2}$'`),
  ],
);

export const consents = pgTable(
  "consents",
  {
    id: primaryId(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 40 }).notNull(),
    documentVersion: varchar("document_version", { length: 40 }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("consents_profile_document_version_unique").on(
      table.profileId,
      table.documentType,
      table.documentVersion,
    ),
  ],
);
