import postgres from "postgres";

const email = process.argv[2] || "maya.campbell.demo@mycsecpal.com";
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  const [user] = await sql`select id from auth.users where lower(email)=lower(${email}) limit 1`;
  if (!user) throw new Error(`No auth user found for ${email}.`);
  const periodEnd = new Date();
  periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  const [subscription] = await sql`
    insert into subscriptions(profile_id,stripe_subscription_id,stripe_price_id,status,current_period_end,cancel_at_period_end)
    values(${user.id}::uuid,${`demo_practice_${user.id}`},'demo_practice','active',${periodEnd.toISOString()}::timestamptz,'false')
    on conflict(stripe_subscription_id) do update set status='active',current_period_end=excluded.current_period_end,
      cancel_at_period_end='false',updated_at=now()
    returning status,current_period_end
  `;
  console.log(JSON.stringify({ email, plan: "practice", status: subscription.status, currentPeriodEnd: subscription.current_period_end }));
} finally {
  await sql.end({ timeout: 2 });
}
