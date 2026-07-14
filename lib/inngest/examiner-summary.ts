import { sql } from "drizzle-orm";
import { z } from "zod";

const generatedSummarySchema = z.object({
  summary: z.string().min(80).max(1600),
  strengths: z.array(z.string().min(20).max(500)).max(5),
  misconceptions: z.array(z.string().min(20).max(500)).max(5),
  patterns: z.array(z.string().min(20).max(500)).max(5),
  nextSteps: z.array(z.string().min(20).max(500)).min(1).max(5),
});

export type GeneratedExaminerSummary = z.infer<typeof generatedSummarySchema>;

export async function generatePaperTwoSummary(evidence: unknown): Promise<GeneratedExaminerSummary | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_REVIEW_MODEL || process.env.OPENROUTER_MARKING_MODEL;
  if (!apiKey || !model) return null;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "x-title": "MyCSECPal Examiner Summary" },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: "json_schema", json_schema: { name: "examiner_summary", strict: true, schema: {
        type: "object", additionalProperties: false,
        required: ["summary", "strengths", "misconceptions", "patterns", "nextSteps"],
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", maxItems: 5, items: { type: "string" } },
          misconceptions: { type: "array", maxItems: 5, items: { type: "string" } },
          patterns: { type: "array", maxItems: 5, items: { type: "string" } },
          nextSteps: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
        },
      } } },
      messages: [
        { role: "system", content: "You are a perceptive CSEC Mathematics teacher writing an end-of-paper report. Synthesize the complete marking evidence into an individualized teaching report. Explain what the learner appears to understand, the approaches they attempted, exactly where their reasoning repeatedly broke down, and how to improve. Connect patterns across questions instead of restating scores. Every claim must be supported by the supplied responses, marks, or examiner feedback. Use plain, encouraging Caribbean classroom English; be candid but never shaming. Vary the number of insights to match the evidence and avoid generic advice such as 'check your work' unless you name what to check and how." },
        { role: "user", content: JSON.stringify(evidence) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter summary failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as any;
  const content = payload?.choices?.[0]?.message?.content;
  return generatedSummarySchema.parse(typeof content === "string" ? JSON.parse(content) : content);
}

export async function writeEvidenceSummary(tx: any, resultId: string, generated?: GeneratedExaminerSummary | null) {
  const topicRows = await tx.execute(sql`select t.name, atr.percentage, atr.evidence_count from attempt_topic_results atr join topics t on t.id=atr.topic_id where atr.result_id=${resultId} order by atr.percentage desc, atr.evidence_count desc`) as Array<Record<string, unknown>>;
  const [header] = await tx.execute(sql`select r.percentage,r.time_used_seconds,pv.duration_seconds,(select count(*) from question_marks qm where qm.result_id=r.id and qm.awarded_marks=0) zero_marks,(select count(*) from question_marks qm where qm.result_id=r.id and qm.awarded_marks>0 and qm.awarded_marks<qm.max_marks) partial_marks from results r join attempts a on a.id=r.attempt_id join paper_versions pv on pv.id=a.paper_version_id where r.id=${resultId}`) as Array<Record<string, unknown>>;
  if (!header) return;
  const percentage=Number(header.percentage), strongest=topicRows.find((row)=>Number(row.evidence_count)>=2), focus=[...topicRows].reverse().find((row)=>Number(row.evidence_count)>=2);
  const strengths=strongest?[`${strongest.name} was your strongest evidenced topic (${Math.round(Number(strongest.percentage))}%).`]:[];
  const misconceptions=focus&&Number(focus.percentage)<70?[`Review ${focus.name}; the available evidence was ${Math.round(Number(focus.percentage))}%.`]:[];
  const partial=Number(header.partial_marks), zero=Number(header.zero_marks), patterns:string[]=[];
  if(partial) patterns.push(`You earned partial credit on ${partial} question${partial===1?"":"s"}; complete each method and conclusion.`);
  if(zero) patterns.push(`${zero} question${zero===1?"":"s"} earned no marks; start with the first missed rubric step in each examiner note.`);
  const summary=generated?.summary ?? (percentage>=80?"A strong attempt. Your methods were generally accurate; use the review to tighten the few missed steps.":percentage>=60?"A solid foundation is visible. Finish each method carefully and check the final answer.":"This attempt gives you a clear starting point. Rework the lowest-scoring topic, then try similar questions before another full paper.");
  const nextSteps=focus?[`Practise 3–5 questions from ${focus.name}, showing every step.`,"Retry missed questions without looking at the original response."]:["Review the question-level examiner notes and retry missed items."];
  const usedMinutes=Math.max(1,Math.round(Number(header.time_used_seconds)/60)),allowedMinutes=Math.max(1,Math.round(Number(header.duration_seconds)/60)),remainingMinutes=Math.max(0,allowedMinutes-usedMinutes);
  const timeObservation=remainingMinutes?`You used approximately ${usedMinutes} of ${allowedMinutes} minutes, leaving about ${remainingMinutes} minutes for checking or unfinished parts.`:`You used approximately the full ${allowedMinutes}-minute session.`;
  await tx.execute(sql`insert into examiner_summaries(result_id,summary,strengths_json,misconceptions_json,time_observation,patterns_json,next_steps_json,prompt_version) values(${resultId},${summary},${JSON.stringify(generated?.strengths ?? strengths)}::jsonb,${JSON.stringify(generated?.misconceptions ?? misconceptions)}::jsonb,${timeObservation},${JSON.stringify(generated?.patterns ?? patterns)}::jsonb,${JSON.stringify(generated?.nextSteps ?? nextSteps)}::jsonb,${generated ? 'paper2-teaching-summary-v2' : 'evidence-summary-v1'}) on conflict(result_id) do update set summary=excluded.summary,strengths_json=excluded.strengths_json,misconceptions_json=excluded.misconceptions_json,time_observation=excluded.time_observation,patterns_json=excluded.patterns_json,next_steps_json=excluded.next_steps_json,prompt_version=excluded.prompt_version,updated_at=now()`);
}
