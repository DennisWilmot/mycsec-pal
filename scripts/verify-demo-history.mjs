import postgres from "postgres";

const email = process.argv[2] || "maya.campbell.demo@mycsecpal.com";
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
const sql = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  const rows = await sql`
    select s.name as subject, p.paper_type, count(*)::int as attempts,
      count(es.report_json)::int as dynamic_reports
    from auth.users u
    join attempts a on a.profile_id=u.id and a.display_code like 'DEMO-%' and a.status='marked'
    join paper_versions pv on pv.id=a.paper_version_id
    join papers p on p.id=pv.paper_id
    join subjects s on s.id=p.subject_id
    join results r on r.attempt_id=a.id and r.published_at is not null
    left join examiner_summaries es on es.result_id=r.id
    where lower(u.email)=lower(${email})
    group by s.name,p.paper_type order by s.name,p.paper_type
  `;
  const totals = rows.reduce((acc, row) => ({ attempts: acc.attempts + row.attempts, reports: acc.reports + row.dynamic_reports }), { attempts: 0, reports: 0 });
  const [mathTopics] = await sql`select count(distinct atr.topic_id)::int as count
    from auth.users u join attempts a on a.profile_id=u.id and a.display_code like 'DEMO-%'
    join paper_versions pv on pv.id=a.paper_version_id join papers p on p.id=pv.paper_id
    join subjects s on s.id=p.subject_id and s.slug='mathematics'
    join results r on r.attempt_id=a.id join attempt_topic_results atr on atr.result_id=r.id
    where lower(u.email)=lower(${email})`;
  console.log(JSON.stringify({ email, totals, mathematicsTopics: mathTopics.count, breakdown: rows }));
  if (totals.attempts !== 8 || totals.reports !== 8 || mathTopics.count !== 6) process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
