import postgres from "postgres";

const email = process.argv[2] || "maya.campbell.demo@mycsecpal.com";
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
const plans = [
  { subject: "mathematics", paper: "paper_1", days: 2, percentage: 82, minutes: 54 },
  { subject: "english-a", paper: "paper_2", days: 5, percentage: 74, minutes: 119 },
  { subject: "mathematics", paper: "paper_2", days: 9, percentage: 68, minutes: 102 },
  { subject: "english-a", paper: "paper_1", days: 13, percentage: 79, minutes: 61 },
  { subject: "mathematics", paper: "paper_1", days: 22, percentage: 71, minutes: 58 },
  { subject: "english-a", paper: "paper_2", days: 31, percentage: 65, minutes: 111 },
  { subject: "mathematics", paper: "paper_2", days: 39, percentage: 62, minutes: 108 },
  { subject: "english-a", paper: "paper_1", days: 46, percentage: 69, minutes: 64 },
];

const reports = {
  mathematics: {
    summary: "Maya is most secure when a question signals a familiar procedure, and she usually sets that procedure up accurately. The marks lost here came less from weak recall than from moving too quickly between representations: a correct algebraic idea was sometimes disconnected from the diagram, unit, or final check the question required.",
    findings: [
      { heading: "The method is often right before the final turn", insight: "Several responses begin with a valid operation, but the last conversion or substitution changes the meaning of the result. This suggests Maya knows which tool to reach for but is not yet testing whether the answer still fits the original quantities.", evidence: ["Q2: the percentage method was set up correctly before the base quantity was changed.", "Q5: the equation was rearranged successfully, but the final value was not substituted back into the stated relationship."], action: "After finding a value, write one short check using the original equation, unit, or estimate before moving on." },
      { heading: "Diagrams need to become working information", insight: "When information is split between text and a figure, Maya tends to calculate from the most visible numbers instead of first recording what each length or angle represents. That makes otherwise sensible calculations answer a nearby—but different—question.", evidence: ["Q4: the selected lengths form a valid calculation, but they are not the requested dimensions.", "Q6: the angle fact needed from the diagram was not carried into the working."], action: "Annotate the requested quantity and one governing relationship on the diagram before calculating." },
    ],
  },
  "english-a": {
    summary: "Maya reads for the main situation confidently and her answers usually remain relevant, but she does not always turn a sound impression into a defensible interpretation. The strongest responses quote or paraphrase a precise detail and explain its effect; the weaker ones stop after naming a feeling, tone, or technique without showing how the language creates it.",
    findings: [
      { heading: "Good instincts need a second sentence of proof", insight: "Maya often identifies the writer's attitude correctly, which shows that she understands the passage as a whole. Marks are lost when the answer gives the label but not the chain from a particular word or image to that interpretation.", evidence: ["Q2: “frustrated” is a plausible reading, but the response does not use the repeated interruptions in the extract to justify it.", "Q4(b): the image is identified, yet its effect on the reader is left unexplained."], action: "Use a two-sentence pattern: make the inference, then explain how one exact detail produces it." },
      { heading: "Purpose and audience are shaping choices, not labels", insight: "In the extended response, the content is clear and organized, but the register stays almost identical throughout. A stronger answer would deliberately select tone, detail, and sentence shape for the named reader and purpose.", evidence: ["Q6: the opening states the topic clearly but does not create the urgency expected for the intended audience.", "Q6: two useful examples are included, although neither is developed into a persuasive consequence for the reader."], action: "Before writing, note the audience, desired reaction, and two language choices that will create that reaction." },
      { heading: "Concise answers are strongest when they preserve the distinction", insight: "Maya is capable of economical expression, but occasionally compresses two different ideas into one broad statement. The result sounds fluent while losing the contrast the question is testing.", evidence: ["Q3: the answer captures change, but not the contrast between the speaker's public confidence and private doubt."], action: null },
    ],
  },
};

function isoDaysAgo(days, hour = 16) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 15, 0, 0);
  return date.toISOString();
}

try {
  const [user] = await sql`select id from auth.users where lower(email)=lower(${email}) limit 1`;
  if (!user) throw new Error(`No auth user found for ${email}.`);
  await sql.begin(async (tx) => {
    await tx`insert into profile_subjects(profile_id,subject_id,sort_order,is_active)
      select ${user.id}::uuid,id,case when slug='mathematics' then 0 else 1 end,true
      from subjects where slug in ('mathematics','english-a')
      on conflict(profile_id,subject_id) do update set is_active=true,sort_order=excluded.sort_order`;
    await tx`delete from attempts where profile_id=${user.id}::uuid and display_code like 'DEMO-%'`;

    for (const [index, plan] of plans.entries()) {
      const [paper] = await tx`select pv.id version_id,pv.duration_seconds,p.title,s.name subject_name
        from paper_versions pv join papers p on p.id=pv.paper_id join subjects s on s.id=p.subject_id
        where s.slug=${plan.subject} and p.paper_type=${plan.paper} and pv.status='published'
        order by pv.version desc limit 1`;
      if (!paper) throw new Error(`No published ${plan.subject} ${plan.paper}.`);
      const questions = await tx`select q.id,q.question_number,q.prompt_json,q.total_marks,
        coalesce(jsonb_agg(jsonb_build_object('id',qo.id,'label',qo.label,'content',qo.content_json) order by qo.sort_order) filter(where qo.id is not null),'[]'::jsonb) options
        from questions q left join question_options qo on qo.question_id=q.id
        where q.paper_version_id=${paper.version_id} and q.status in ('approved','published')
        group by q.id order by q.question_number limit 6`;
      if (!questions.length) throw new Error(`No questions found for ${plan.subject} ${plan.paper}.`);
      const submitted = isoDaysAgo(plan.days);
      const started = new Date(new Date(submitted).getTime() - plan.minutes * 60000).toISOString();
      const displayCode = `DEMO-${String(index + 1).padStart(3, "0")}`;
      const [attempt] = await tx`insert into attempts(display_code,profile_id,paper_version_id,status,started_at,submitted_at,expires_at,elapsed_seconds,last_activity_at)
        values(${displayCode},${user.id}::uuid,${paper.version_id},'marked',${started}::timestamptz,${submitted}::timestamptz,${submitted}::timestamptz,${plan.minutes * 60},${submitted}::timestamptz) returning id`;
      let maxScore = 0;
      const seededQuestions = [];
      for (const [qIndex, question] of questions.entries()) {
        const marks = Math.max(1, Number(question.total_marks));
        maxScore += marks;
        const snapshot = { prompt: question.prompt_json, options: question.options };
        const [aq] = await tx`insert into attempt_questions(attempt_id,question_id,position,question_snapshot_json,max_marks)
          values(${attempt.id},${question.id},${qIndex + 1},${tx.json(snapshot)},${marks}) returning id`;
        const [correct] = await tx`select id from question_options where question_id=${question.id} and is_correct=true order by sort_order limit 1`;
        const [selected] = await tx`select id from question_options where question_id=${question.id} order by case when is_correct=${qIndex % 4 !== 1} then 0 else 1 end,sort_order limit 1`;
        await tx`insert into attempt_responses(attempt_question_id,profile_id,selected_option_id,response_json,answered_at,client_revision,server_revision)
          values(${aq.id},${user.id}::uuid,${selected?.id ?? null},${tx.json({ parts: {}, workingLines: ["I identified the main requirement and worked from the evidence given."], graphPoints: [] })},${submitted}::timestamptz,1,1)`;
        seededQuestions.push({ aq, question, correct, selected, marks, qIndex });
      }
      const rawScore = Number((maxScore * plan.percentage / 100).toFixed(2));
      const [result] = await tx`insert into results(attempt_id,raw_score,max_score,percentage,questions_completed,time_used_seconds,published_at)
        values(${attempt.id},${rawScore},${maxScore},${plan.percentage},${questions.length},${plan.minutes * 60},${submitted}::timestamptz) returning id`;
      await tx`insert into marking_jobs(attempt_id,status,provider,model,prompt_version,attempt_count,started_at,completed_at)
        values(${attempt.id},'completed','demo','curated','demo-history-v2',1,${submitted}::timestamptz,${submitted}::timestamptz)`;
      for (const item of seededQuestions) {
        const correct = item.correct?.id && item.selected?.id === item.correct.id;
        const awarded = correct ? item.marks : Number((item.marks * 0.45).toFixed(2));
        const feedback = plan.subject === "english-a"
          ? (correct ? "This choice follows the passage's exact wording and preserves the distinction the question is testing." : "Your choice is understandable from the general mood, but it overlooks the contrast in the final clause. Anchor the inference in that change of wording before selecting an answer.")
          : (correct ? "The selected result is consistent with the quantities and the required operation." : "Your first operation points toward the right concept, but the selected result uses the wrong base quantity. Substitute it back into the original relationship to catch the mismatch.");
        await tx`insert into question_marks(result_id,attempt_question_id,awarded_marks,max_marks,is_correct,feedback,marking_evidence_json)
          values(${result.id},${item.aq.id},${awarded},${item.marks},${Boolean(correct)},${feedback},${tx.json({ source: "curated_demo", questionSpecific: true })})`;
      }
      const report = reports[plan.subject];
      await tx`insert into examiner_summaries(result_id,summary,strengths_json,misconceptions_json,time_observation,patterns_json,next_steps_json,report_json,prompt_version)
        values(${result.id},${report.summary},'[]'::jsonb,'[]'::jsonb,${`Maya used ${plan.minutes} minutes and maintained a steady pace across the paper.`},'[]'::jsonb,'[]'::jsonb,${tx.json(report)},'curated-dynamic-demo-v1')`;
      const topicRows = await tx`select distinct qt.topic_id from question_topics qt where qt.question_id in ${tx(questions.map(q => q.id))} limit 5`;
      for (const [topicIndex, topic] of topicRows.entries()) {
        const topicPercentage = Math.max(48, Math.min(91, plan.percentage + (topicIndex - 2) * 5));
        await tx`insert into attempt_topic_results(result_id,topic_id,score,max_score,percentage,evidence_count)
          values(${result.id},${topic.topic_id},${topicPercentage},100,${topicPercentage},${Math.max(1, questions.length - topicIndex)})`;
      }
    }
  });
  console.log(JSON.stringify({ seeded: true, email, attempts: plans.length, subjects: ["Mathematics", "English A"] }));
} finally {
  await sql.end();
}
