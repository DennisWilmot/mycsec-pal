import { sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { generateExaminerSummary, writeEvidenceSummary } from "./examiner-summary";

type PaperOneAnswer = {
  attempt_question_id: string;
  position: number;
  max_marks: number;
  prompt: unknown;
  selected_option_id: string | null;
  selected_option: unknown;
  correct_option_id: string | null;
  correct_option: unknown;
};

const reviewSchema = z.object({
  reviews: z.array(z.object({
    attemptQuestionId: z.string().uuid(),
    feedback: z.string().min(30).max(800),
  })).max(60),
});

function optionDescription(value: unknown) {
  if (!value || typeof value !== "object") return "the recorded option";
  const option = value as { label?: unknown; content?: { text?: unknown } };
  const label = typeof option.label === "string" ? option.label : "";
  const content = typeof option.content?.text === "string" ? option.content.text : "";
  return [label && `${label}.`, content].filter(Boolean).join(" ") || "the recorded option";
}

async function reviewPaperOneAnswers(answers: PaperOneAnswer[]) {
  const reviewTargets = answers.filter((answer) => answer.selected_option_id !== answer.correct_option_id);
  if (!reviewTargets.length) return new Map<string, string>();
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_REVIEW_MODEL || process.env.OPENROUTER_MARKING_MODEL;
  if (!apiKey || !model) return new Map<string, string>();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "x-title": "MyCSECPal Paper 1 Review" },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      response_format: { type: "json_schema", json_schema: { name: "paper_one_reviews", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["reviews"],
        properties: { reviews: { type: "array", maxItems: 60, items: { type: "object", additionalProperties: false, required: ["attemptQuestionId", "feedback"], properties: { attemptQuestionId: { type: "string" }, feedback: { type: "string" } } } } },
      } } },
      messages: [
        { role: "system", content: "You are an insightful CSEC Mathematics teacher reviewing multiple-choice errors. Scoring has already been determined; never change it. For each item, use the exact prompt, selected option, and correct option to infer the likely misconception. Explain what the learner may have been trying to do, identify why that reasoning leads to the chosen distractor, and demonstrate the correct method or decisive check. Refer to the actual values and notation. For an unanswered item, teach the first useful step. Write one compact teaching paragraph per item; never say only that the candidate chose the wrong answer, never shame the learner, and never invent work that is not evidenced by the selected option." },
        { role: "user", content: JSON.stringify(reviewTargets.map((answer) => ({ attemptQuestionId: answer.attempt_question_id, question: answer.position, prompt: answer.prompt, selectedOption: answer.selected_option, correctOption: answer.correct_option }))) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter Paper 1 review failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as any;
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = reviewSchema.parse(typeof content === "string" ? JSON.parse(content) : content);
  const expected = new Set(reviewTargets.map((answer) => answer.attempt_question_id));
  if (parsed.reviews.length !== reviewTargets.length || parsed.reviews.some((review) => !expected.has(review.attemptQuestionId))) {
    throw new Error("Paper 1 reviewer returned an incomplete or unexpected question set.");
  }
  return new Map(parsed.reviews.map((review) => [review.attemptQuestionId, review.feedback]));
}

/** Scores MCQs deterministically, then generates evidence-grounded teaching feedback. */
export async function markPaperOneAttempt(attemptId: string, markingJobId: string) {
  const db = getDatabase();
  const claimed = await db.transaction(async (tx) => {
    const header = await tx.execute(sql`
      select a.id, a.status, a.elapsed_seconds, p.paper_type,
             mj.status as marking_job_status
      from attempts a
      join paper_versions pv on pv.id = a.paper_version_id
      join papers p on p.id = pv.paper_id
      join marking_jobs mj on mj.attempt_id = a.id
      where a.id = ${attemptId} and mj.id = ${markingJobId}
      for update of a, mj
    `);
    const attempt = header[0] as Record<string, unknown> | undefined;
    if (!attempt) throw new NonRetriableError("Attempt or marking job does not exist.");
    if (attempt.paper_type !== "paper_1") return { status: "awaiting_paper_2_marker" as const };
    if (attempt.marking_job_status === "completed" || attempt.status === "marked") return { status: "already_marked" as const };
    if (!["submitted", "marking", "marking_failed"].includes(String(attempt.status))) {
      throw new NonRetriableError(`Attempt is not ready for marking (status: ${attempt.status}).`);
    }
    await tx.execute(sql`update marking_jobs set status='processing',attempt_count=attempt_count+1,started_at=coalesce(started_at,now()),last_error=null,provider='openrouter',model=${process.env.OPENROUTER_REVIEW_MODEL ?? process.env.OPENROUTER_MARKING_MODEL ?? null},prompt_version='p1-teaching-review-v2',updated_at=now() where id=${markingJobId}`);
    await tx.execute(sql`update attempts set status='marking',updated_at=now() where id=${attemptId}`);
    const answerRows = await tx.execute(sql`
      select aq.id attempt_question_id,aq.position,aq.max_marks,aq.question_snapshot_json->'prompt' prompt,
             ar.selected_option_id,
             case when selected.id is null then null else jsonb_build_object('label',selected.label,'content',selected.content_json) end selected_option,
             correct.id correct_option_id,jsonb_build_object('label',correct.label,'content',correct.content_json) correct_option
      from attempt_questions aq
      left join attempt_responses ar on ar.attempt_question_id=aq.id
      left join question_options selected on selected.id=ar.selected_option_id
      left join lateral (select qo.id,qo.label,qo.content_json from question_options qo where qo.question_id=aq.question_id and qo.is_correct=true order by qo.sort_order limit 1) correct on true
      where aq.attempt_id=${attemptId} order by aq.position
    `);
    const answers = answerRows as unknown as PaperOneAnswer[];
    if (!answers.length || answers.some((answer) => !answer.correct_option_id)) throw new NonRetriableError("Paper 1 answer key is incomplete.");
    return { status: "ready" as const, elapsedSeconds: Number(attempt.elapsed_seconds), answers };
  });
  if (claimed.status !== "ready") return { status: claimed.status, attemptId };

  const { answers } = claimed;
  const rawScore=answers.reduce((total,answer)=>total+(answer.selected_option_id===answer.correct_option_id?Number(answer.max_marks):0),0);
  const maxScore=answers.reduce((total,answer)=>total+Number(answer.max_marks),0);
  const completed=answers.filter((answer)=>answer.selected_option_id!==null).length;
  const percentage=Number(((rawScore/maxScore)*100).toFixed(2));
  const reviews=await reviewPaperOneAnswers(answers);
  const generatedSummary=await generateExaminerSummary({paper:"CSEC Mathematics Paper 1",score:{awarded:rawScore,maximum:maxScore,percentage,questionsAnswered:completed,totalQuestions:answers.length},questions:answers.map((answer)=>({question:answer.position,prompt:answer.prompt,selectedOption:answer.selected_option,correctOption:answer.correct_option,isCorrect:answer.selected_option_id===answer.correct_option_id,examinerFeedback:reviews.get(answer.attempt_question_id)??null}))}).catch((error)=>{console.error("Paper 1 examiner summary generation failed",error);return null;});

  return db.transaction(async (tx) => {
    const [attempt]=await tx.execute(sql`select status from attempts where id=${attemptId} for update`) as unknown as Record<string,unknown>[];
    if(attempt?.status==="marked") return {status:"already_marked",attemptId};
    const inserted=await tx.execute(sql`insert into results(attempt_id,raw_score,max_score,percentage,questions_completed,time_used_seconds,published_at) values(${attemptId},${rawScore},${maxScore},${percentage},${completed},${claimed.elapsedSeconds},now()) on conflict(attempt_id) do update set raw_score=excluded.raw_score,max_score=excluded.max_score,percentage=excluded.percentage,questions_completed=excluded.questions_completed,time_used_seconds=excluded.time_used_seconds,published_at=excluded.published_at,updated_at=now() returning id`);
    const resultId=String((inserted[0] as Record<string,unknown>).id);
    await tx.execute(sql`delete from question_marks where result_id=${resultId}`);
    for(const answer of answers){const isCorrect=answer.selected_option_id===answer.correct_option_id;const feedback=isCorrect?`Correct — ${optionDescription(answer.correct_option)}`:reviews.get(answer.attempt_question_id)??(answer.selected_option_id?"Review the selected option against the correct method shown by the answer key.":"No answer was submitted; begin by identifying the values and operation the question asks for.");await tx.execute(sql`insert into question_marks(result_id,attempt_question_id,awarded_marks,max_marks,is_correct,feedback,marking_evidence_json) values(${resultId},${answer.attempt_question_id},${isCorrect?Number(answer.max_marks):0},${Number(answer.max_marks)},${isCorrect},${feedback},${JSON.stringify({method:"deterministic_option_match",version:2,reviewer:isCorrect?"answer_key":"openrouter_teaching_review"})}::jsonb)`);}
    await tx.execute(sql`delete from attempt_topic_results where result_id=${resultId}`);
    await tx.execute(sql`insert into attempt_topic_results(result_id,topic_id,score,max_score,percentage,evidence_count) select ${resultId},qt.topic_id,sum((case when qm.is_correct then qm.awarded_marks else 0 end)*qt.weight),sum(qm.max_marks*qt.weight),round(100*sum((case when qm.is_correct then qm.awarded_marks else 0 end)*qt.weight)/nullif(sum(qm.max_marks*qt.weight),0),2),count(*)::int from question_marks qm join attempt_questions aq on aq.id=qm.attempt_question_id join question_topics qt on qt.question_id=aq.question_id where qm.result_id=${resultId} group by qt.topic_id having sum(qm.max_marks*qt.weight)>0`);
    await writeEvidenceSummary(tx,resultId,generatedSummary);
    await tx.execute(sql`update marking_jobs set status='completed',completed_at=now(),updated_at=now() where id=${markingJobId}`);
    await tx.execute(sql`update attempts set status='marked',updated_at=now() where id=${attemptId}`);
    await tx.execute(sql`insert into attempt_events(attempt_id,type,metadata_json) values(${attemptId},'marked',${JSON.stringify({resultId,rawScore,maxScore,percentage,marker:"deterministic_paper_1_v2",reviewer:"openrouter"})}::jsonb)`);
    await tx.execute(sql`insert into outbox_events(dedupe_key,aggregate_type,aggregate_id,event_type,payload_json) values(${`attempt.marked:${attemptId}`},'attempt',${attemptId},'attempt/marked',${JSON.stringify({attemptId,resultId,rawScore,maxScore,percentage})}::jsonb) on conflict(dedupe_key) do nothing`);
    return {status:"marked",attemptId,resultId,rawScore,maxScore,percentage};
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
