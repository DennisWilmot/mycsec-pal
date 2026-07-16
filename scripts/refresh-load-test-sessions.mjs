import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

for (const name of ["LOAD_TEST_SUPABASE_URL", "LOAD_TEST_JWT_SECRET", "DATABASE_URL"]) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const fixturePath = resolve(process.env.LOAD_TEST_FILE ?? "load/load-users.json");
const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
if (!Array.isArray(fixtures) || !fixtures.length) throw new Error("No load-test fixtures were found.");

const supabaseUrl = process.env.LOAD_TEST_SUPABASE_URL;
const jwtSecret = process.env.LOAD_TEST_JWT_SECRET;
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2, connect_timeout: 15 });

function sign(user, sessionId, expiresAt) {
  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: `${supabaseUrl}/auth/v1`,
    sub: user.id,
    aud: "authenticated",
    exp: expiresAt,
    iat: now,
    email: user.email,
    phone: "",
    app_metadata: user.app_metadata ?? {},
    user_metadata: user.user_metadata ?? {},
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "load_test", timestamp: now }],
    session_id: sessionId,
    is_anonymous: false,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac("sha256", jwtSecret).update(unsigned).digest("base64url")}`;
}

try {
  const attemptIds = fixtures.map((fixture) => fixture.attemptId);
  const rows = await sql`
    select a.id attempt_id, u.id, u.email,
      u.raw_app_meta_data app_metadata, u.raw_user_meta_data user_metadata
    from attempts a
    join auth.users u on u.id = a.profile_id
    where a.id in ${sql(attemptIds)}
  `;
  const byAttempt = new Map(rows.map((row) => [row.attempt_id, row]));
  if (byAttempt.size !== fixtures.length) throw new Error(`Resolved ${byAttempt.size}/${fixtures.length} fixture identities.`);

  const now = new Date();
  const tokenExpiresAt = Math.floor(now.getTime() / 1_000) + 3_600;
  const attemptExpiresAt = new Date(now.getTime() + 90 * 60 * 1_000);
  const sessions = fixtures.map((fixture) => {
    const user = byAttempt.get(fixture.attemptId);
    const sessionId = randomUUID();
    const accessToken = sign(user, sessionId, tokenExpiresAt);
    const encoded = `base64-${Buffer.from(JSON.stringify({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3_600,
      expires_at: tokenExpiresAt,
      refresh_token: `load-test-${randomBytes(24).toString("base64url")}`,
      user: { ...user, session_id: sessionId },
    })).toString("base64url")}`;
    fixture.cookie = `sb-${projectRef}-auth-token=${encoded}`;
    return {
      id: sessionId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      aal: "aal1",
      not_after: attemptExpiresAt,
      refreshed_at: now,
      user_agent: "MyCSECPal load test",
      tag: "load-test-refresh",
    };
  });

  await sql.begin(async (tx) => {
    await tx`insert into auth.sessions ${tx(sessions,
      "id", "user_id", "created_at", "updated_at", "aal", "not_after", "refreshed_at", "user_agent", "tag")}`;
    await tx`
      delete from attempt_responses r
      using attempt_questions q
      where r.attempt_question_id=q.id and q.attempt_id in ${tx(attemptIds)}
    `;
    await tx`
      update attempts set status='in_progress', expires_at=${attemptExpiresAt},
        last_activity_at=${now}, updated_at=${now}
      where id in ${tx(attemptIds)}
    `;
  });
  await writeFile(fixturePath, `${JSON.stringify(fixtures, null, 2)}\n`, { mode: 0o600 });
  console.log(`Refreshed ${fixtures.length} disposable load-test sessions.`);
} finally {
  await sql.end({ timeout: 10 });
}
