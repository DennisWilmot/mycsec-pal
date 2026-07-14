import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./identity";
import { createdAt, updatedAt } from "./helpers";

export const billingCustomers = pgTable("billing_customers", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 120 }).notNull().unique(),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 120 }).notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 120 }),
  status: varchar("status", { length: 40 }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: text("cancel_at_period_end").notNull().default("false"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [uniqueIndex("subscriptions_stripe_unique").on(table.stripeSubscriptionId), index("subscriptions_profile_status_idx").on(table.profileId, table.status)]);

export const billingEvents = pgTable("billing_events", {
  stripeEventId: varchar("stripe_event_id", { length: 160 }).primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payloadJson: text("payload_json").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promotionCodes = pgTable("promotion_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
  durationDays: integer("duration_days").notNull(),
  dailyAttemptLimit: integer("daily_attempt_limit").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("promotion_codes_code_unique").on(table.code),
  check("promotion_codes_normalized_code_check", sql`${table.code} = lower(trim(${table.code}))`),
  check("promotion_codes_duration_check", sql`${table.durationDays} > 0`),
  check("promotion_codes_daily_limit_check", sql`${table.dailyAttemptLimit} > 0`),
]);

export const promotionRedemptions = pgTable("promotion_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  promotionCodeId: uuid("promotion_code_id").notNull().references(() => promotionCodes.id, { onDelete: "restrict" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("promotion_redemptions_code_profile_unique").on(table.promotionCodeId, table.profileId),
  index("promotion_redemptions_profile_expiry_idx").on(table.profileId, table.expiresAt),
]);
