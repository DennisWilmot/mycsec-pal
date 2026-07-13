import { sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getDatabase } from "@/lib/db";
import { writeEvidenceSummary } from "./examiner-summary";

type PaperOneAnswer = {
  attempt_question_id: string;
  max_marks: number;
  selected_option_id: string | null;
  correct_option_id: string | null;
};

/** Deterministic MCQ marker. Safe to call repeatedly: the result write is transactional. */
export async function markPaperOneAttempt(attemptId: string, markingJobId: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const header = await tx.execute(sql`
      select a.id, a.status, a.elapsed_seconds, p.paper_type,
             mj.id as marking_job_id, mj.status as marking_job_status
      from attempts a
      join paper_versions pv on pv.id = a.paper_version_id
      join papers p on p.id = pv.paper_id
      join marking_jobs mj on mj.attempt_id = a.id
      where a.id = ${attemptId} and mj.id = ${markingJobId}
      for update of a, mj
    `);
    const attempt = header[0] as Record<string, unknown> | undefined;
    if (!attempt) throw new NonRetriableError("Attempt or marking job does not exist.");
    if (attempt.paper_type !== "paper_1") {
      return { status: "awaiting_paper_2_marker", attemptId };
    }
    if (attempt.marking_job_status === "completed" || attempt.status === "marked") {
      return { status: "already_marked", attemptId };
    }
    if (!["submitted", "marking", "marking_failed"].includes(String(attempt.status))) {
      throw new NonRetriableError(`Attempt is not ready for marking (status: ${attempt.status}).`);
    }

    await tx.execute(sql`
      update marking_jobs set status = 'processing', attempt_count = attempt_count + 1,
        started_at = coalesce(started_at, now()), last_error = null, updated_at = now()
      where id = ${markingJobId}
    `);
    await tx.execute(sql`
      update attempts set status = 'marking', updated_at = now() where id = ${attemptId}
    `);

    const answerRows = await tx.execute(sql`
      select aq.id as attempt_question_id, aq.max_marks,
             ar.selected_option_id,
             correct.id as correct_option_id
      from attempt_questions aq
      left join attempt_responses ar on ar.attempt_question_id = aq.id
      left join lateral (
        select qo.id from question_options qo
        where qo.question_id = aq.question_id and qo.is_correct = true
        order by qo.sort_order limit 1
      ) correct on true
      where aq.attempt_id = ${attemptId}
      order by aq.position
    `);
    const answers = answerRows as unknown as PaperOneAnswer[];
    if (answers.length === 0 || answers.some((answer) => !answer.correct_option_id)) {
      throw new NonRetriableError("Paper 1 answer key is incomplete.");
    }

    const rawScore = answers.reduce(
      (total, answer) => total + (answer.selected_option_id === answer.correct_option_id ? Number(answer.max_marks) : 0),
      0,
    );
    const maxScore = answers.reduce((total, answer) => total + Number(answer.max_marks), 0);
    const completed = answers.filter((answer) => answer.selected_option_id !== null).length;
    const percentage = Number(((rawScore / maxScore) * 100).toFixed(2));

    const inserted = await tx.execute(sql`
      insert into results (attempt_id, raw_score, max_score, percentage, questions_completed,
        time_used_seconds, published_at)
      values (${attemptId}, ${rawScore}, ${maxScore}, ${percentage}, ${completed},
        ${Number(attempt.elapsed_seconds)}, now())
      on conflict (attempt_id) do update set
        raw_score = excluded.raw_score, max_score = excluded.max_score,
        percentage = excluded.percentage, questions_completed = excluded.questions_completed,
        time_used_seconds = excluded.time_used_seconds, published_at = excluded.published_at,
        updated_at = now()
      returning id
    `);
    const resultId = String((inserted[0] as Record<string, unknown>).id);

    await tx.execute(sql`delete from question_marks where result_id = ${resultId}`);
    for (const answer of answers) {
      const isCorrect = answer.selected_option_id === answer.correct_option_id;
      await tx.execute(sql`
        insert into question_marks
          (result_id, attempt_question_id, awarded_marks, max_marks, is_correct, feedback, marking_evidence_json)
        values (${resultId}, ${answer.attempt_question_id},
          ${isCorrect ? Number(answer.max_marks) : 0}, ${Number(answer.max_marks)}, ${isCorrect},
          ${isCorrect ? "Correct." : answer.selected_option_id ? "Incorrect option selected." : "No answer submitted."},
          ${JSON.stringify({ method: "deterministic_option_match", version: 1 })}::jsonb)
      `);
    }

    await tx.execute(sql`delete from attempt_topic_results where result_id = ${resultId}`);
    await tx.execute(sql`
      insert into attempt_topic_results (result_id, topic_id, score, max_score, percentage, evidence_count)
      select ${resultId}, qt.topic_id,
        sum((case when qm.is_correct then qm.awarded_marks else 0 end) * qt.weight),
        sum(qm.max_marks * qt.weight),
        round(100 * sum((case when qm.is_correct then qm.awarded_marks else 0 end) * qt.weight)
          / nullif(sum(qm.max_marks * qt.weight), 0), 2),
        count(*)::int
      from question_marks qm
      join attempt_questions aq on aq.id = qm.attempt_question_id
      join question_topics qt on qt.question_id = aq.question_id
      where qm.result_id = ${resultId}
      group by qt.topic_id
      having sum(qm.max_marks * qt.weight) > 0
    `);

    await writeEvidenceSummary(tx, resultId);
    await tx.execute(sql`
      update marking_jobs set status = 'completed', completed_at = now(), updated_at = now()
      where id = ${markingJobId}
    `);
    await tx.execute(sql`
      update attempts set status = 'marked', updated_at = now() where id = ${attemptId}
    `);
    await tx.execute(sql`
      insert into attempt_events (attempt_id, type, metadata_json)
      values (${attemptId}, 'marked',
        ${JSON.stringify({ resultId, rawScore, maxScore, percentage, marker: "deterministic_paper_1_v1" })}::jsonb)
    `);
    await tx.execute(sql`
      insert into outbox_events
        (dedupe_key, aggregate_type, aggregate_id, event_type, payload_json)
      values (${`attempt.marked:${attemptId}`}, 'attempt', ${attemptId}, 'attempt/marked',
        ${JSON.stringify({ attemptId, resultId, rawScore, maxScore, percentage })}::jsonb)
      on conflict (dedupe_key) do nothing
    `);

    return { status: "marked", attemptId, resultId, rawScore, maxScore, percentage };
  });
}

export async function recordMarkingFailure(attemptId: string, markingJobId: string, error: string) {
  const db = getDatabase();
  const message = error.slice(0, 4000);
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update marking_jobs
      set status = 'failed', last_error = ${message}, updated_at = now()
      where id = ${markingJobId} and attempt_id = ${attemptId} and status <> 'completed'
    `);
    await tx.execute(sql`
      update attempts set status = 'marking_failed', updated_at = now()
      where id = ${attemptId} and status in ('submitted', 'marking')
    `);
    await tx.execute(sql`
      insert into attempt_events (attempt_id, type, metadata_json)
      select ${attemptId}, 'marking_failed', ${JSON.stringify({ source: "inngest_retries_exhausted" })}::jsonb
      where exists (select 1 from attempts where id = ${attemptId} and status = 'marking_failed')
    `);
    await tx.execute(sql`
      insert into outbox_events
        (dedupe_key, aggregate_type, aggregate_id, event_type, payload_json)
      select ${`attempt.marking_failed:${attemptId}`}, 'attempt', ${attemptId}, 'attempt/marking_failed',
        ${JSON.stringify({ attemptId, message: "Marking is taking longer than expected." })}::jsonb
      where exists (select 1 from attempts where id = ${attemptId} and status = 'marking_failed')
      on conflict (dedupe_key) do nothing
    `);
  });
}
