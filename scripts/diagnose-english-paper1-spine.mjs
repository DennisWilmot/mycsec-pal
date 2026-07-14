import postgres from "postgres";

const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
const sql = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  const rows = await sql`
    select pbs.position,pbs.module_number,pbs.assessment_profile,pbs.difficulty,
      pbs.question_type,pbs.marks,pbs.selection_group,t.name topic,
      count(distinct q.id)::int eligible
    from paper_blueprint_slots pbs
    join paper_versions spine on spine.id=pbs.paper_version_id
    join papers p on p.id=spine.paper_id
    join subjects s on s.id=p.subject_id
    left join topics t on t.id=pbs.topic_id
    left join paper_versions pool on pool.paper_id=spine.paper_id and pool.syllabus_version_id=spine.syllabus_version_id
    left join questions q on q.paper_version_id=pool.id and q.status='published'
      and q.module_number=pbs.module_number and q.assessment_profile=pbs.assessment_profile
      and q.difficulty=pbs.difficulty and q.type=pbs.question_type and q.total_marks=pbs.marks
      and (pbs.topic_id is null or exists(select 1 from question_topics qt where qt.question_id=q.id and qt.topic_id=pbs.topic_id))
    where s.slug='english-a' and p.paper_type='paper_1' and spine.status='published'
    group by pbs.position,pbs.module_number,pbs.assessment_profile,pbs.difficulty,
      pbs.question_type,pbs.marks,pbs.selection_group,t.name
    order by pbs.position
  `;
  const perVersion = await sql`
    select pv.id,pv.version,q.module_number,q.assessment_profile,q.difficulty,count(*)::int available
    from paper_versions pv join papers p on p.id=pv.paper_id join subjects s on s.id=p.subject_id
    join questions q on q.paper_version_id=pv.id and q.status='published'
    where s.slug='english-a' and p.paper_type='paper_1' and pv.status='published'
    group by pv.id,pv.version,q.module_number,q.assessment_profile,q.difficulty
    order by pv.version,q.module_number,q.assessment_profile,q.difficulty
  `;
  const demand = await sql`
    select pbs.module_number,pbs.assessment_profile,pbs.difficulty,count(*)::int required
    from paper_blueprint_slots pbs join paper_versions pv on pv.id=pbs.paper_version_id
    join papers p on p.id=pv.paper_id join subjects s on s.id=p.subject_id
    where s.slug='english-a' and p.paper_type='paper_1' and pv.status='published'
    group by pbs.module_number,pbs.assessment_profile,pbs.difficulty
    order by pbs.module_number,pbs.assessment_profile,pbs.difficulty
  `;
  console.log(JSON.stringify({ slots: rows.length, empty: rows.filter(row => row.eligible === 0), tail: rows.slice(-8), demand, perVersion }, null, 2));
} finally {
  await sql.end({ timeout: 2 });
}
