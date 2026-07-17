import crypto from "node:crypto";
import postgres from "postgres";

const email = process.argv[2] || "maya.campbell.demo@mycsecpal.com";
const password = `Pal-${crypto.randomBytes(9).toString("base64url")}-A1!`;
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!databaseUrl || !supabaseUrl || !publicKey) {
  throw new Error("Database and Supabase public credentials are required.");
}

const sql = postgres(databaseUrl, { prepare: false });
try {
  const [user] = await sql`
    select id, email
    from auth.users
    where lower(email) = lower(${email})
    limit 1
  `;
  if (!user) throw new Error(`Test user not found: ${email}`);

  await sql.begin(async (tx) => {
    await tx`
      update auth.users
      set encrypted_password = extensions.crypt(${password}, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = ${user.id}::uuid
    `;
    await tx`delete from auth.sessions where user_id = ${user.id}::uuid`;
    await tx`delete from auth.refresh_tokens where user_id = ${user.id}::text`;
  });

  const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publicKey, "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  });
  const body = await login.json();
  if (!login.ok || !body.access_token) {
    throw new Error(body.msg || body.message || `Password verification failed (${login.status}).`);
  }

  console.log(JSON.stringify({ email: user.email, password, userId: user.id, authenticated: true }));
} finally {
  await sql.end();
}
