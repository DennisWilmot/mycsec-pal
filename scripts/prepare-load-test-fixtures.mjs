import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const required = [
  "LOAD_TEST_SUPABASE_URL",
  "LOAD_TEST_SUPABASE_ANON_KEY",
  "LOAD_TEST_SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const count = Math.max(1, Math.min(2_000, Number(process.env.LOAD_TEST_USERS ?? 1_000)));
const concurrency = Math.max(1, Math.min(20, Number(process.env.LOAD_TEST_SETUP_CONCURRENCY ?? 8)));
const outputPath = resolve(process.env.LOAD_TEST_OUTPUT ?? "load/load-users.json");
const runId = process.env.LOAD_TEST_RUN_ID ?? new Date().toISOString().replaceAll(/[^0-9]/g, "").slice(0, 14);
const supabaseUrl = process.env.LOAD_TEST_SUPABASE_URL;
const anonKey = process.env.LOAD_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.LOAD_TEST_SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.LOAD_TEST_JWT_SECRET;
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: Math.min(concurrency, 10),
  connect_timeout: 15,
  idle_timeout: 30,
});

function cookieHeader(setCookies) {
  const values = new Map();
  for (const cookie of setCookies) values.set(cookie.name, cookie.value);
  return [...values].map(([name, value]) => `${name}=${value}`).join("; ");
}

function signedAccessToken(user) {
  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: `${supabaseUrl}/auth/v1`,
    sub: user.id,
    aud: "authenticated",
    exp: now + 3_600,
    iat: now,
    email: user.email,
    phone: "",
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "load_test", timestamp: now }],
    session_id: user.session_id,
    is_anonymous: false,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac("sha256", jwtSecret).update(unsigned).digest("base64url")}`;
}

function syntheticSession(user, sessionId) {
  const sessionUser = { ...user, session_id: sessionId };
  const accessToken = signedAccessToken(sessionUser);
  const session = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3_600,
    expires_at: Math.floor(Date.now() / 1_000) + 3_600,
    refresh_token: `load-test-${randomBytes(24).toString("base64url")}`,
    user: sessionUser,
  };
  const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  return { cookie: `sb-${projectRef}-auth-token=${encoded}`, sessionId };
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function createAdminUser(input) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const result = await admin.auth.admin.createUser(input);
      if (!result.error && result.data.user) return result.data.user;
      lastError = result.error ?? new Error("Supabase did not return the created user.");
      if (![0, 429, 500, 502, 503, 504].includes(Number(result.error?.status ?? 0))) throw lastError;
    } catch (error) {
      lastError = error;
    }
    await delay(Math.min(15_000, 500 * 2 ** attempt));
  }
  throw lastError ?? new Error("Supabase user creation failed after retries.");
}

async function signInWithRetry(client, credentials) {
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const result = await client.auth.signInWithPassword(credentials);
      if (!result.error) return;
      lastError = result.error;
      if (![0, 429, 500, 502, 503, 504].includes(Number(result.error.status ?? 0))) throw lastError;
    } catch (error) {
      lastError = error;
    }
    // The Auth token endpoint has a project-wide rate window. Use a slower
    // backoff than user creation so fixture setup cannot create its own spike.
    await delay(Math.min(60_000, 2_000 * 2 ** attempt));
  }
  throw lastError ?? new Error("Supabase sign-in failed after retries.");
}

async function createIdentity(index) {
  const email = `loadtest-${runId}-${String(index + 1).padStart(4, "0")}@example.com`;
  const password = `Lt-${randomBytes(24).toString("base64url")}`;
  const createdUser = await createAdminUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { loadTest: true, runId },
  });
  if (jwtSecret) {
    const sessionId = randomUUID();
    const session = syntheticSession(createdUser, sessionId);
    return { id: createdUser.id, email, cookie: session.cookie, user: createdUser, sessionId };
  }

  let setCookies = [];
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (nextCookies) => { setCookies = nextCookies; },
    },
  });
  await signInWithRetry(client, { email, password });
  const cookie = cookieHeader(setCookies);
  if (!cookie) throw new Error(`No auth cookie was issued for ${email}.`);
  return { id: createdUser.id, email, cookie };
}

async function pooledMap(length, worker) {
  const results = new Array(length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, length) }, async () => {
    while (cursor < length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(index);
      if ((index + 1) % 50 === 0) console.log(`Prepared ${index + 1}/${length} Auth sessions.`);
    }
  }));
  return results;
}

try {
  const [template] = await sql`
    select q.id question_id,q.external_id,q.question_number,q.module_number,q.objective_code,
      q.assessment_profile,q.difficulty,q.type,q.prompt_json,q.asset_url,q.total_marks,
      pv.id paper_version_id,pv.duration_seconds
    from questions q
    join paper_versions pv on pv.id=q.paper_version_id
    join papers p on p.id=pv.paper_id
    join subjects s on s.id=p.subject_id
    where s.slug='mathematics' and p.paper_type='paper_1'
      and p.status='published' and pv.status='published' and q.status='published'
    order by pv.version desc,q.question_number
    limit 1
  `;
  if (!template) throw new Error("The staging question bank has no published Mathematics Paper 1 question.");
  const options = await sql`
    select id,label,content_json,sort_order,is_correct from question_options
    where question_id=${template.question_id} order by sort_order
  `;
  const identities = await pooledMap(count, createIdentity);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(template.duration_seconds) * 1_000);
  const snapshot = {
    snapshotVersion: 2,
    externalId: template.external_id,
    questionNumber: template.question_number,
    moduleNumber: template.module_number,
    objectiveCode: template.objective_code,
    assessmentProfile: template.assessment_profile,
    difficulty: template.difficulty,
    type: template.type,
    prompt: template.prompt_json,
    assetUrl: template.asset_url,
    parts: [],
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      content: option.content_json,
      sortOrder: option.sort_order,
      isCorrect: option.is_correct,
    })),
  };
  const attempts = identities.map((identity, index) => ({
    id: randomUUID(),
    display_code: `LT-${runId.slice(-8)}-${String(index + 1).padStart(5, "0")}`,
    profile_id: identity.id,
    paper_version_id: template.paper_version_id,
    expires_at: expiresAt,
    last_activity_at: now,
  }));
  const attemptQuestions = attempts.map((attempt) => ({
    id: randomUUID(),
    attempt_id: attempt.id,
    question_id: template.question_id,
    position: 1,
    question_snapshot_json: snapshot,
    max_marks: template.total_marks,
  }));

  await sql.begin(async (tx) => {
    if (jwtSecret) await tx`insert into auth.sessions ${tx(identities.map((identity) => ({
      id: identity.sessionId,
      user_id: identity.id,
      created_at: now,
      updated_at: now,
      aal: "aal1",
      not_after: expiresAt,
      refreshed_at: now,
      user_agent: "MyCSECPal load test",
      tag: runId,
    })), "id", "user_id", "created_at", "updated_at", "aal", "not_after", "refreshed_at", "user_agent", "tag")}`;
    await tx`insert into profiles ${tx(identities.map((identity, index) => ({
      id: identity.id,
      display_name: `Load Test ${index + 1}`,
      role: "student",
      country_code: "JM",
      grade_form: "Load Test",
      onboarding_completed_at: now,
    })), "id", "display_name", "role", "country_code", "grade_form", "onboarding_completed_at")}`;
    await tx`insert into attempts ${tx(attempts, "id", "display_code", "profile_id", "paper_version_id", "expires_at", "last_activity_at")}`;
    await tx`insert into attempt_questions ${tx(attemptQuestions, "id", "attempt_id", "question_id", "position", "question_snapshot_json", "max_marks")}`;
  });

  const optionId = String(options[0].id);
  const fixtures = identities.map((identity, index) => ({
    cookie: identity.cookie,
    attemptId: attempts[index].id,
    attemptQuestionId: attemptQuestions[index].id,
    selectedOptionId: optionId,
    paperType: "paper_1",
  }));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(fixtures, null, 2)}\n`, { mode: 0o600 });
  console.log(`Wrote ${fixtures.length} disposable load-test fixtures to ${outputPath}.`);
} finally {
  await sql.end({ timeout: 10 });
}
