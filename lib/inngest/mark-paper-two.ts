import { sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { writeEvidenceSummary } from "./examiner-summary";

const outputSchema = z.object({
  parts: z.array(z.object({
    partId: z.string().uuid(),
    awardedMarks: z.number().nonnegative(),
    feedback: z.string().min(1).max(500),
    matchedCriteria: z.array(z.string()).max(12),
    missedCriteria: z.array(z.string()).max(12),
  })).min(1).max(40),
});

type Row = Record<string, unknown>;
type Part = { id:string; questionId:string; attemptQuestionId:string; position:number; questionMax:number; label:string; marks:number; prompt:unknown; rubric:any; response:unknown };

function learnerPart(response: any, partId: string) {
  return response?.parts?.[partId] ?? { workingLines: [], graphPoints: [] };
}

async function runMarker(parts: Part[]) {
  const apiKey=process.env.OPENROUTER_API_KEY, model=process.env.OPENROUTER_MARKING_MODEL;
  if(!apiKey||!model) throw new NonRetriableError("OPENROUTER_API_KEY and OPENROUTER_MARKING_MODEL are required for Paper 2 marking.");
  const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json","x-title":"MyCSECPal Paper 2 Marker"},body:JSON.stringify({model,temperature:0,response_format:{type:"json_schema",json_schema:{name:"paper_two_marks",strict:true,schema:{type:"object",additionalProperties:false,required:["parts"],properties:{parts:{type:"array",items:{type:"object",additionalProperties:false,required:["partId","awardedMarks","feedback","matchedCriteria","missedCriteria"],properties:{partId:{type:"string"},awardedMarks:{type:"number"},feedback:{type:"string"},matchedCriteria:{type:"array",items:{type:"string"}},missedCriteria:{type:"array",items:{type:"string"}}}}}}}}},messages:[{role:"system",content:"You are a careful CSEC Mathematics examiner. Award marks only for evidence present in the learner response. Follow the human-reviewed rubric, accept equivalent notation and valid alternative methods, never exceed the maximum, and give a concise actionable note. Blank work earns zero."},{role:"user",content:JSON.stringify(parts.map((part)=>({partId:part.id,question:part.position,label:part.label,maximumMarks:part.marks,prompt:part.prompt,learnerResponse:part.response,rubric:part.rubric}))) }]} )});
  if(!response.ok) throw new Error(`OpenRouter failed (${response.status}): ${(await response.text()).slice(0,500)}`);
  const payload=await response.json() as any, content=payload?.choices?.[0]?.message?.content;
  const parsed=outputSchema.parse(typeof content==="string"?JSON.parse(content):content);
  const expected=new Map(parts.map((part)=>[part.id,part]));
  if(parsed.parts.length!==parts.length||new Set(parsed.parts.map((part)=>part.partId)).size!==parts.length) throw new Error("Marker returned an incomplete or duplicate part set.");
  for(const mark of parsed.parts){const part=expected.get(mark.partId);if(!part||mark.awardedMarks>part.marks) throw new Error("Marker returned an invalid part or mark boundary.");}
  return parsed.parts;
}

export async function markPaperTwoAttempt(attemptId:string,markingJobId:string){
  const db=getDatabase();
  const rows=await db.transaction(async(tx)=>{
    const [header]=await tx.execute(sql`select a.status,p.paper_type,mj.status job_status from attempts a join paper_versions pv on pv.id=a.paper_version_id join papers p on p.id=pv.paper_id join marking_jobs mj on mj.attempt_id=a.id where a.id=${attemptId} and mj.id=${markingJobId} for update of a,mj`) as unknown as Row[];
    if(!header) throw new NonRetriableError("Attempt or marking job does not exist.");
    if(header.paper_type!=="paper_2") throw new NonRetriableError("Paper 2 marker received a different paper type.");
    if(header.job_status==="completed"||header.status==="marked") return [];
    if(!["submitted","marking","marking_failed"].includes(String(header.status))) throw new NonRetriableError("Attempt is not ready for marking.");
    await tx.execute(sql`update marking_jobs set status='processing',attempt_count=attempt_count+1,started_at=coalesce(started_at,now()),last_error=null,provider='openrouter',model=${process.env.OPENROUTER_MARKING_MODEL??null},prompt_version='p2-rubric-v1',updated_at=now() where id=${markingJobId}`);
    await tx.execute(sql`update attempts set status='marking',updated_at=now() where id=${attemptId}`);
    return tx.execute(sql`select aq.id attempt_question_id,aq.question_id,aq.position,aq.max_marks,ar.response_json,qp.id part_id,qp.label,qp.prompt_json,qp.marks,ms.scheme_json from attempt_questions aq join question_parts qp on qp.question_id=aq.question_id join mark_schemes ms on ms.question_part_id=qp.id and ms.version=1 left join attempt_responses ar on ar.attempt_question_id=aq.id where aq.attempt_id=${attemptId} order by aq.position,qp.sort_order`) as unknown as Row[];
  });
  if(!rows.length) return {status:"already_marked",attemptId};
  const parts:Part[]=rows.map((row)=>({id:String(row.part_id),questionId:String(row.question_id),attemptQuestionId:String(row.attempt_question_id),position:Number(row.position),questionMax:Number(row.max_marks),label:String(row.label),marks:Number(row.marks),prompt:row.prompt_json,rubric:row.scheme_json,response:learnerPart(row.response_json,String(row.part_id))}));
  if(parts.some((part)=>part.rubric?.kind!=="criteria_v1"||!part.rubric?.humanReviewed)) throw new NonRetriableError("A human-reviewed Paper 2 rubric is missing.");
  const marks=await runMarker(parts), markByPart=new Map(marks.map((mark)=>[mark.partId,mark]));
  return db.transaction(async(tx)=>{
    const [attempt]=await tx.execute(sql`select status,elapsed_seconds from attempts where id=${attemptId} for update`) as unknown as Row[];
    if(attempt?.status==="marked") return {status:"already_marked",attemptId};
    const questions=new Map<string,{position:number;max:number;parts:Part[]}>();
    for(const part of parts){const current=questions.get(part.attemptQuestionId)??{position:part.position,max:part.questionMax,parts:[]};current.parts.push(part);questions.set(part.attemptQuestionId,current);}
    const totals=[...questions.entries()].map(([attemptQuestionId,question])=>({attemptQuestionId,question,score:question.parts.reduce((sum,part)=>sum+(markByPart.get(part.id)?.awardedMarks??0),0)}));
    const rawScore=totals.reduce((sum,item)=>sum+item.score,0),maxScore=totals.reduce((sum,item)=>sum+item.question.max,0),completed=totals.filter((item)=>item.question.parts.some((part)=>JSON.stringify(part.response)!==JSON.stringify({workingLines:[],graphPoints:[]}))).length,percentage=Number((100*rawScore/maxScore).toFixed(2));
    const [inserted]=await tx.execute(sql`insert into results(attempt_id,raw_score,max_score,percentage,questions_completed,time_used_seconds,published_at) values(${attemptId},${rawScore},${maxScore},${percentage},${completed},${Number(attempt.elapsed_seconds)},now()) on conflict(attempt_id) do update set raw_score=excluded.raw_score,max_score=excluded.max_score,percentage=excluded.percentage,questions_completed=excluded.questions_completed,time_used_seconds=excluded.time_used_seconds,published_at=excluded.published_at,updated_at=now() returning id`) as unknown as Row[];
    const resultId=String(inserted.id);await tx.execute(sql`delete from question_marks where result_id=${resultId}`);
    for(const item of totals){const evidence=item.question.parts.map((part)=>markByPart.get(part.id)!);const missed=evidence.flatMap((mark)=>mark.missedCriteria);const feedback=missed.length?`Review: ${missed.slice(0,3).join("; ")}.`:"The submitted work met the reviewed rubric.";await tx.execute(sql`insert into question_marks(result_id,attempt_question_id,awarded_marks,max_marks,is_correct,feedback,marking_evidence_json) values(${resultId},${item.attemptQuestionId},${item.score},${item.question.max},${item.score===item.question.max},${feedback},${JSON.stringify({method:"openrouter_rubric_v1",parts:evidence})}::jsonb)`);}
    await tx.execute(sql`delete from attempt_topic_results where result_id=${resultId}`);await tx.execute(sql`insert into attempt_topic_results(result_id,topic_id,score,max_score,percentage,evidence_count) select ${resultId},qt.topic_id,sum(qm.awarded_marks*qt.weight),sum(qm.max_marks*qt.weight),round(100*sum(qm.awarded_marks*qt.weight)/nullif(sum(qm.max_marks*qt.weight),0),2),count(*)::int from question_marks qm join attempt_questions aq on aq.id=qm.attempt_question_id join question_topics qt on qt.question_id=aq.question_id where qm.result_id=${resultId} group by qt.topic_id having sum(qm.max_marks*qt.weight)>0`);
    await writeEvidenceSummary(tx,resultId);await tx.execute(sql`update marking_jobs set status='completed',completed_at=now(),updated_at=now() where id=${markingJobId}`);await tx.execute(sql`update attempts set status='marked',updated_at=now() where id=${attemptId}`);await tx.execute(sql`insert into attempt_events(attempt_id,type,metadata_json) values(${attemptId},'marked',${JSON.stringify({resultId,rawScore,maxScore,percentage,marker:"openrouter_rubric_v1"})}::jsonb)`);await tx.execute(sql`insert into outbox_events(dedupe_key,aggregate_type,aggregate_id,event_type,payload_json) values(${`attempt.marked:${attemptId}`},'attempt',${attemptId},'attempt/marked',${JSON.stringify({attemptId,resultId,rawScore,maxScore,percentage})}::jsonb) on conflict(dedupe_key) do nothing`);
    return {status:"marked",attemptId,resultId,rawScore,maxScore,percentage};
  });
}
