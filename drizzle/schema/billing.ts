import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
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
