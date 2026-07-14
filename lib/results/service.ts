import { getDatabaseClient } from "@/lib/db";

type ResultHeader = {
  attempt_id: string;
  display_code: string;
  attempt_status: string;
  started_at: Date;
  submitted_at: Date | null;
  elapsed_seconds: number;
  marking_status: string | null;
  marking_error: string | null;
  subject_name: string;
  paper_title: string;
  paper_type: string;
  result_id: string | null;
  raw_score: string | null;
  max_score: string | null;
  percentage: string | null;
  questions_completed: number | null;
  time_used_seconds: number | null;
  published_at: Date | null;
  total_questions: number;
  summary: string | null;
  strengths: unknown;
  misconceptions: unknown;
  time_observation: string | null;
  patterns: unknown;
  next_steps: unknown;
  report_json: unknown;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function publicState(attemptStatus: string, markingStatus: string | null) {
  if (attemptStatus === "marked") return "marked";
  if (attemptStatus === "marking_failed" || markingStatus === "failed") return "failed";
  if (attemptStatus === "marking" || markingStatus === "processing") return "marking";
  if (attemptStatus === "submitted" || markingStatus === "pending") return "queued";
  return "not_submitted";
}

export async function readOwnedResult(profileId: string, attemptId: string) {
  const sql = getDatabaseClient();
  const [header] = await sql<ResultHeader[]>`
    select a.id as attempt_id, a.display_code, a.status as attempt_status,
      a.started_at, a.submitted_at, a.elapsed_seconds,
      mj.status as marking_status, mj.last_error as marking_error,
      s.name as subject_name, p.title as paper_title, p.paper_type,
      r.id as result_id, r.raw_score, r.max_score, r.percentage,
      r.questions_completed, r.time_used_seconds, r.published_at,
      (select count(*)::int from attempt_questions aq where aq.attempt_id = a.id) as total_questions,
      es.summary, es.strengths_json as strengths, es.misconceptions_json as misconceptions,
      es.time_observation, es.patterns_json as patterns, es.next_steps_json as next_steps,
      es.report_json
    from attempts a
    join paper_versions pv on pv.id = a.paper_version_id
    join papers p on p.id = pv.paper_id
    join subjects s on s.id = p.subject_id
    left join marking_jobs mj on mj.attempt_id = a.id
    left join results r on r.attempt_id = a.id and r.published_at is not null
    left join examiner_summaries es on es.result_id = r.id
    where a.id = ${attemptId}::uuid and a.profile_id = ${profileId}::uuid
    limit 1
  `;
  if (!header) return null;

  const state = publicState(header.attempt_status, header.marking_status);
  const questions = state === "marked" && header.result_id
    ? await sql<{
      id: string; position: number; max_marks: number; snapshot: Record<string, unknown>;
      selected_option_id: string | null; response: unknown; is_flagged: boolean | null;
      awarded_marks: string; marked_max_marks: string; is_correct: boolean; feedback: string | null;
      marking_evidence: unknown;
      correct_option_id: string | null;
    }[]>`
      select aq.id, aq.position, aq.max_marks, aq.question_snapshot_json as snapshot,
        ar.selected_option_id, ar.response_json as response, ar.is_flagged,
        qm.awarded_marks, qm.max_marks as marked_max_marks, qm.is_correct, qm.feedback,
        qm.marking_evidence_json as marking_evidence,
        correct_option.id as correct_option_id
      from attempt_questions aq
      join question_marks qm on qm.attempt_question_id = aq.id and qm.result_id = ${header.result_id}::uuid
      left join attempt_responses ar on ar.attempt_question_id = aq.id
      left join lateral (
        select qo.id from question_options qo
        where qo.question_id = aq.question_id and qo.is_correct = true
        order by qo.sort_order limit 1
      ) correct_option on true
      where aq.attempt_id = ${attemptId}::uuid
      order by aq.position
    `
    : [];

  return {
    attempt: {
      id: header.attempt_id,
      displayCode: header.display_code,
      state,
      status: header.attempt_status,
      markingStatus: header.marking_status,
      submittedAt: header.submitted_at,
      subjectName: header.subject_name,
      paperTitle: header.paper_title,
      paperType: header.paper_type,
    },
    result: header.result_id ? {
      id: header.result_id,
      rawScore: Number(header.raw_score),
      maxScore: Number(header.max_score),
      percentage: Number(header.percentage),
      questionsCompleted: header.questions_completed,
      totalQuestions: header.total_questions,
      timeUsedSeconds: header.time_used_seconds,
      publishedAt: header.published_at,
    } : null,
    examinerSummary: header.summary ? {
      summary: header.summary,
      findings: header.report_json && typeof header.report_json === "object" && Array.isArray((header.report_json as { findings?: unknown }).findings)
        ? (header.report_json as { findings: unknown[] }).findings
        : [],
      strengths: stringArray(header.strengths),
      misconceptions: stringArray(header.misconceptions),
      timeObservation: header.time_observation,
      patterns: stringArray(header.patterns),
      nextSteps: stringArray(header.next_steps),
    } : null,
    failure: state === "failed" ? {
      message: "We could not finish marking this paper. Your answers are safe and the marking job can be retried.",
      reference: header.display_code,
    } : null,
    questions: questions.map((question) => ({
      id: question.id,
      position: question.position,
      maxMarks: Number(question.marked_max_marks),
      awardedMarks: Number(question.awarded_marks),
      isCorrect: question.is_correct,
      feedback: question.feedback,
      markingEvidence: question.marking_evidence,
      snapshot: question.snapshot,
      response: {
        selectedOptionId: question.selected_option_id,
        value: question.response,
        isFlagged: Boolean(question.is_flagged),
      },
      correctOptionId: question.correct_option_id,
    })),
  };
}
