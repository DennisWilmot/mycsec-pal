import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";

type Row = Record<string, unknown>;
const number = (value: unknown) => Number(value ?? 0);

export async function readProgressDashboard(profileId: string, requestedSubjectId?: string | null) {
  const db = getDatabase();
  const subjectRows = await db.execute(sql`
    select s.id, s.slug, s.name
    from profile_subjects ps
    join subjects s on s.id = ps.subject_id
    where ps.profile_id = ${profileId} and ps.is_active = true
    order by ps.sort_order, s.sort_order
  `) as unknown as Row[];
  const validSubjectIds = new Set(subjectRows.map((row) => String(row.id)));
  const subjectId = requestedSubjectId && validSubjectIds.has(requestedSubjectId) ? requestedSubjectId : null;
  const subjectClause = subjectId ? sql`and s.id = ${subjectId}` : sql``;

  const [summaryRow] = await db.execute(sql`
    with owned as (
      select r.percentage, r.time_used_seconds, r.published_at, a.submitted_at,
             s.name as subject_name, p.paper_type
      from results r
      join attempts a on a.id = r.attempt_id and a.profile_id = ${profileId} and a.status = 'marked'
      join paper_versions pv on pv.id = a.paper_version_id
      join papers p on p.id = pv.paper_id
      join subjects s on s.id = p.subject_id
    )
    select
      count(*) filter (where published_at >= date_trunc('month', now()))::int as current_count,
      coalesce(round(avg(percentage) filter (where published_at >= date_trunc('month', now())), 2), 0) as current_average,
      coalesce(sum(time_used_seconds) filter (where published_at >= date_trunc('month', now())), 0)::int as current_time,
      count(*) filter (where published_at >= date_trunc('month', now()) - interval '1 month' and published_at < date_trunc('month', now()))::int as previous_count,
      coalesce(round(avg(percentage) filter (where published_at >= date_trunc('month', now()) - interval '1 month' and published_at < date_trunc('month', now())), 2), 0) as previous_average
    from owned
  `) as unknown as Row[];

  const [lastRow] = await db.execute(sql`
    select r.published_at, s.name as subject_name, p.paper_type
    from results r
    join attempts a on a.id = r.attempt_id and a.profile_id = ${profileId} and a.status = 'marked'
    join paper_versions pv on pv.id = a.paper_version_id
    join papers p on p.id = pv.paper_id
    join subjects s on s.id = p.subject_id
    order by r.published_at desc nulls last limit 1
  `) as unknown as Row[];

  const profileRows = subjectId
    ? await db.execute(sql`
        select t.id, t.name as label,
          round(100 * sum(atr.score) / nullif(sum(atr.max_score), 0), 2) as value,
          sum(atr.evidence_count)::int as evidence
        from attempt_topic_results atr
        join results r on r.id = atr.result_id
        join attempts a on a.id = r.attempt_id and a.profile_id = ${profileId} and a.status = 'marked'
        join topics t on t.id = atr.topic_id and t.subject_id = ${subjectId}
        group by t.id, t.name, t.sort_order
        order by t.sort_order
      `)
    : await db.execute(sql`
        select s.id, s.name as label, round(avg(r.percentage), 2) as value, count(*)::int as evidence
        from results r
        join attempts a on a.id = r.attempt_id and a.profile_id = ${profileId} and a.status = 'marked'
        join paper_versions pv on pv.id = a.paper_version_id
        join papers p on p.id = pv.paper_id
        join subjects s on s.id = p.subject_id
        join profile_subjects ps on ps.subject_id = s.id and ps.profile_id = ${profileId} and ps.is_active = true
        group by s.id, s.name, ps.sort_order order by ps.sort_order
      `);

  const attemptRows = await db.execute(sql`
    select a.id, a.display_code, s.name as subject_name, s.id as subject_id,
      p.paper_type, r.percentage, r.published_at
    from results r
    join attempts a on a.id = r.attempt_id and a.profile_id = ${profileId} and a.status = 'marked'
    join paper_versions pv on pv.id = a.paper_version_id
    join papers p on p.id = pv.paper_id
    join subjects s on s.id = p.subject_id
    where true ${subjectClause}
    order by r.published_at desc nulls last, a.id desc limit 10
  `) as unknown as Row[];

  const topicRows = await db.execute(sql`
    select t.id, t.name as topic_name, s.name as subject_name, s.id as subject_id,
      round(100 * sum(atr.score) / nullif(sum(atr.max_score), 0), 2) as score,
      sum(atr.evidence_count)::int as evidence, max(r.published_at) as last_practised
    from attempt_topic_results atr
    join results r on r.id = atr.result_id
    join attempts a on a.id = r.attempt_id and a.profile_id = ${profileId} and a.status = 'marked'
    join topics t on t.id = atr.topic_id
    join subjects s on s.id = t.subject_id
    where true ${subjectClause}
    group by t.id, t.name, s.name, s.id
    order by last_practised desc nulls last, t.name limit 10
  `) as unknown as Row[];

  const axes = (profileRows as unknown as Row[]).map((row) => ({
    id: String(row.id), label: String(row.label), value: Math.round(number(row.value)), evidence: number(row.evidence),
  }));
  const reliable = axes.filter((axis) => axis.evidence >= 3);
  const ordered = [...reliable].sort((a, b) => b.value - a.value);

  return {
    summary: {
      papersCompleted: number(summaryRow?.current_count),
      papersChange: number(summaryRow?.current_count) - number(summaryRow?.previous_count),
      average: Math.round(number(summaryRow?.current_average)),
      averageChange: Math.round(number(summaryRow?.current_average) - number(summaryRow?.previous_average)),
      timeSeconds: number(summaryRow?.current_time),
      lastActivity: lastRow ? {
        at: lastRow.published_at, subjectName: lastRow.subject_name,
        paperNumber: lastRow.paper_type === "paper_2" ? 2 : 1,
      } : null,
    },
    subjects: subjectRows.map((row) => ({ id: String(row.id), slug: String(row.slug), name: String(row.name) })),
    scope: { subjectId, axes, average: axes.length ? Math.round(axes.reduce((sum, axis) => sum + axis.value, 0) / axes.length) : 0,
      strongest: ordered[0] ?? null, focus: ordered.at(-1) ?? null, minimumEvidence: 3 },
    attempts: attemptRows.map((row) => ({
      id: String(row.id), displayCode: String(row.display_code), subjectId: String(row.subject_id),
      subjectName: String(row.subject_name), paperNumber: row.paper_type === "paper_2" ? 2 : 1,
      percentage: Math.round(number(row.percentage)), publishedAt: row.published_at,
    })),
    topics: topicRows.map((row) => ({
      id: String(row.id), subjectId: String(row.subject_id), subjectName: String(row.subject_name),
      topicName: String(row.topic_name), score: Math.round(number(row.score)), evidence: number(row.evidence),
      lastPractised: row.last_practised,
    })),
  };
}
