import { sql } from "drizzle-orm";

export async function writeEvidenceSummary(tx: any, resultId: string) {
  const topicRows = await tx.execute(sql`select t.name, atr.percentage, atr.evidence_count from attempt_topic_results atr join topics t on t.id=atr.topic_id where atr.result_id=${resultId} order by atr.percentage desc, atr.evidence_count desc`) as Array<Record<string, unknown>>;
  const [header] = await tx.execute(sql`select r.percentage,r.time_used_seconds,(select count(*) from question_marks qm where qm.result_id=r.id and qm.awarded_marks=0) zero_marks,(select count(*) from question_marks qm where qm.result_id=r.id and qm.awarded_marks>0 and qm.awarded_marks<qm.max_marks) partial_marks from results r where r.id=${resultId}`) as Array<Record<string, unknown>>;
  if (!header) return;
  const percentage=Number(header.percentage), strongest=topicRows.find((row)=>Number(row.evidence_count)>=2), focus=[...topicRows].reverse().find((row)=>Number(row.evidence_count)>=2);
  const strengths=strongest?[`${strongest.name} was your strongest evidenced topic (${Math.round(Number(strongest.percentage))}%).`]:[];
  const misconceptions=focus&&Number(focus.percentage)<70?[`Review ${focus.name}; the available evidence was ${Math.round(Number(focus.percentage))}%.`]:[];
  const partial=Number(header.partial_marks), zero=Number(header.zero_marks), patterns:string[]=[];
  if(partial) patterns.push(`You earned partial credit on ${partial} question${partial===1?"":"s"}; complete each method and conclusion.`);
  if(zero) patterns.push(`${zero} question${zero===1?"":"s"} earned no marks; start with the first missed rubric step in each examiner note.`);
  const summary=percentage>=80?"A strong attempt. Your methods were generally accurate; use the review to tighten the few missed steps.":percentage>=60?"A solid foundation is visible. Finish each method carefully and check the final answer.":"This attempt gives you a clear starting point. Rework the lowest-scoring topic, then try similar questions before another full paper.";
  const nextSteps=focus?[`Practise 3–5 questions from ${focus.name}, showing every step.`,"Retry missed questions without looking at the original response."]:["Review the question-level examiner notes and retry missed items."];
  const timeObservation=`You used approximately ${Math.max(1,Math.round(Number(header.time_used_seconds)/60))} minutes. Note whether time pressure affected the final questions.`;
  await tx.execute(sql`insert into examiner_summaries(result_id,summary,strengths_json,misconceptions_json,time_observation,patterns_json,next_steps_json,prompt_version) values(${resultId},${summary},${JSON.stringify(strengths)}::jsonb,${JSON.stringify(misconceptions)}::jsonb,${timeObservation},${JSON.stringify(patterns)}::jsonb,${JSON.stringify(nextSteps)}::jsonb,'evidence-summary-v1') on conflict(result_id) do update set summary=excluded.summary,strengths_json=excluded.strengths_json,misconceptions_json=excluded.misconceptions_json,time_observation=excluded.time_observation,patterns_json=excluded.patterns_json,next_steps_json=excluded.next_steps_json,prompt_version=excluded.prompt_version,updated_at=now()`);
}
