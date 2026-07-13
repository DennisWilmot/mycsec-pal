import crypto from "node:crypto";
import postgres from "postgres";

const email = process.argv[2] || "learner.test@mycsecpal.com";
const password = `Pal-${crypto.randomBytes(9).toString("base64url")}-A1!`;
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!databaseUrl || !supabaseUrl || !publicKey) throw new Error("Database and Supabase public credentials are required.");

const sql = postgres(databaseUrl, { prepare: false });
try {
  const [existing] = await sql`select id from auth.users where lower(email)=lower(${email}) limit 1`;
  if (existing) await sql.begin(async (tx) => {
    await tx`delete from public.profiles where id=${existing.id}::uuid`;
    await tx`delete from auth.users where id=${existing.id}::uuid`;
  });

  const signup = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: publicKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password, data: { full_name:"Test Learner", display_name:"Test Learner" } }),
  });
  const signupBody = await signup.json();
  const id = signupBody.user?.id || signupBody.id;
  if (!signup.ok || !id) throw new Error(signupBody.msg || signupBody.message || `Supabase signup failed (${signup.status}).`);

  await sql.begin(async (tx) => {
    await tx`update auth.users set email_confirmed_at=coalesce(email_confirmed_at,now()), updated_at=now() where id=${id}::uuid`;
    await tx`insert into public.profiles(id,display_name,role,country_code,grade_form,onboarding_completed_at)
      values(${id}::uuid,'Test Learner','student','JM','Form 5',now())
      on conflict(id) do update set display_name=excluded.display_name,role=excluded.role,country_code=excluded.country_code,
        grade_form=excluded.grade_form,onboarding_completed_at=excluded.onboarding_completed_at,updated_at=now()`;
    await tx`insert into public.profile_subjects(profile_id,subject_id,sort_order,is_active)
      select ${id}::uuid,id,0,true from public.subjects where slug='mathematics'
      on conflict(profile_id,subject_id) do update set is_active=true,sort_order=0`;
  });

  const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publicKey, "content-type":"application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await login.json();
  if (!login.ok || !loginBody.access_token) throw new Error(loginBody.msg || loginBody.message || `Supabase login failed (${login.status}).`);
  console.log(JSON.stringify({ email, password, userId:id, profile:"Test Learner", authenticated:true }));
} finally {
  await sql.end();
}
