import { getDatabaseClient } from '../lib/db/index.ts';

const client = getDatabaseClient();
try {
  const rows = await client`
    select s.slug, p.paper_type, count(distinct q.id)::int as published_questions,
      count(distinct pv.id)::int as published_versions
    from subjects s
    join papers p on p.subject_id = s.id and p.status = 'published'
    join paper_versions pv on pv.paper_id = p.id and pv.status = 'published'
    join questions q on q.paper_version_id = pv.id and q.status = 'published'
    where s.slug in ('mathematics', 'english-a')
    group by s.slug, p.paper_type
    order by s.slug, p.paper_type
  `;
  const slots = await client`
    select s.slug, p.paper_type, count(pbs.id)::int as spine_slots
    from paper_blueprint_slots pbs
    join paper_versions pv on pv.id = pbs.paper_version_id
    join papers p on p.id = pv.paper_id
    join subjects s on s.id = p.subject_id
    where s.slug in ('mathematics', 'english-a')
    group by s.slug, p.paper_type
    order by s.slug, p.paper_type
  `;
  const expected = new Map([
    ['mathematics:paper_1', { questions: 120, versions: 2, slots: 60 }],
    ['mathematics:paper_2', { questions: 18, versions: 2, slots: 9 }],
    ['english-a:paper_1', { questions: 180, versions: 3, slots: 60 }],
    ['english-a:paper_2', { questions: 18, versions: 3, slots: 6 }],
  ]);
  const slotMap = new Map(slots.map((row) => [`${row.slug}:${row.paper_type}`, Number(row.spine_slots)]));
  const issues = [];
  for (const row of rows) {
    const key = `${row.slug}:${row.paper_type}`;
    const target = expected.get(key);
    if (!target || Number(row.published_questions) !== target.questions || Number(row.published_versions) !== target.versions || slotMap.get(key) !== target.slots) {
      issues.push({ key, actual: { questions: Number(row.published_questions), versions: Number(row.published_versions), slots: slotMap.get(key) }, expected: target });
    }
    expected.delete(key);
  }
  for (const [key, target] of expected) issues.push({ key, actual: null, expected: target });
  console.log(JSON.stringify({ valid: issues.length === 0, pools: rows, slots, issues }, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  await client.end();
}
