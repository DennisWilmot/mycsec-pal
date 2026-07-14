import crypto from "node:crypto";
import postgres from "postgres";

const email = process.argv[2] || "maya.campbell.demo@mycsecpal.com";
const displayName = process.argv[3] || "Maya Campbell";
const schoolName = process.argv[4] || "Campion College";
const phone = process.argv[5] || "+1 876 555 0147";
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
    body: JSON.stringify({ email, password, data: { full_name:displayName, display_name:displayName } }),
  });
  const signupBody = await signup.json();
  const id = signupBody.user?.id || signupBody.id;
  if (!signup.ok || !id) throw new Error(signupBody.msg || signupBody.message || `Supabase signup failed (${signup.status}).`);

  await sql.begin(async (tx) => {
    const [institution] = await tx`
      insert into public.institutions(name,normalized_name,country_code,institution_type)
      values(${schoolName},${schoolName.toLowerCase()},'JM','school')
      on conflict(country_code,normalized_name) do update set name=excluded.name,updated_at=now()
      returning id
    `;
    await tx`update auth.users set email_confirmed_at=coalesce(email_confirmed_at,now()), updated_at=now() where id=${id}::uuid`;
    await tx`insert into public.profiles(id,display_name,phone,role,country_code,institution_id,grade_form,onboarding_completed_at)
      values(${id}::uuid,${displayName},${phone},'student','JM',${institution.id}::uuid,'Form 5',now())
      on conflict(id) do update set display_name=excluded.display_name,role=excluded.role,country_code=excluded.country_code,
        phone=excluded.phone,institution_id=excluded.institution_id,grade_form=excluded.grade_form,
        onboarding_completed_at=excluded.onboarding_completed_at,updated_at=now()`;
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
  console.log(JSON.stringify({ email, password, userId:id, profile:displayName, school:schoolName, gradeForm:"Form 5", country:"Jamaica", authenticated:true }));
} finally {
  await sql.end();
}
