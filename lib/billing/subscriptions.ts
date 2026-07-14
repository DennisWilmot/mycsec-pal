import type Stripe from "stripe";
import type { Sql } from "postgres";

export const ACCESS_STATUSES = new Set(["active", "trialing"]);

// These statuses represent a subscription that must be managed instead of
// starting a second Checkout subscription for the same customer.
export const EXISTING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items?.data?.[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

export async function persistStripeSubscription(
  sql: Sql,
  profileId: string,
  subscription: Stripe.Subscription,
) {
  const item = subscription.items?.data?.[0];
  const priceId = typeof item?.price === "string" ? item.price : item?.price?.id ?? null;
  await sql`
    insert into subscriptions
      (profile_id, stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end)
    values
      (${profileId}::uuid, ${subscription.id}, ${priceId}, ${subscription.status},
       ${subscriptionPeriodEnd(subscription)}, ${String(subscription.cancel_at_period_end)})
    on conflict (stripe_subscription_id) do update set
      profile_id = excluded.profile_id,
      stripe_price_id = excluded.stripe_price_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      updated_at = now()
  `;
}

export function newestRelevantSubscription(subscriptions: Stripe.Subscription[]) {
  return subscriptions
    .filter((subscription) => EXISTING_SUBSCRIPTION_STATUSES.has(subscription.status))
    .sort((left, right) => right.created - left.created)[0] ?? null;
}
