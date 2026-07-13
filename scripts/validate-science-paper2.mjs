import { readFile } from 'node:fs/promises';
import path from 'node:path';
const file = path.resolve(process.argv[2]); const paper = JSON.parse(await readFile(file, 'utf8')); const errors = [];
const expected = { 1: { total: 25, knowledge_comprehension: 3, use_of_knowledge: 12, experimental_skills: 10 }, 2: { total: 15, knowledge_comprehension: 7, use_of_knowledge: 8, experimental_skills: 0 }, 3: { total: 15, knowledge_comprehension: 7, use_of_knowledge: 8, experimental_skills: 0 }, 4: { total: 15, knowledge_comprehension: 6, use_of_knowledge: 9, experimental_skills: 0 }, 5: { total: 15, knowledge_comprehension: 6, use_of_knowledge: 9, experimental_skills: 0 }, 6: { total: 15, knowledge_comprehension: 6, use_of_knowledge: 9, experimental_skills: 0 } };
if (paper.questions?.length !== 6) errors.push('Expected six questions.');
const overall = { knowledge_comprehension: 0, use_of_knowledge: 0, experimental_skills: 0 };
for (const q of paper.questions || []) {
  const exp = expected[q.number]; if (!exp) { errors.push(`Unexpected question ${q.number}.`); continue; }
  const profiles = { knowledge_comprehension: 0, use_of_knowledge: 0, experimental_skills: 0 };
  let total = 0;
  for (const p of q.subparts || []) {
    total += p.marks; profiles[p.profile] += p.marks; overall[p.profile] += p.marks;
    const schemeMarks = (p.markScheme || []).reduce((sum, point) => sum + point.marks, 0);
    if (schemeMarks !== p.marks) errors.push(`Q${q.number}${p.label}: mark scheme ${schemeMarks} != ${p.marks}.`);
    if (/figure|diagram|graph|circuit|apparatus/i.test(p.prompt) && !p.visualSpec && !q.stimulus) errors.push(`Q${q.number}${p.label}: references missing visual.`);
  }
  if (total !== exp.total || q.totalMarks !== exp.total) errors.push(`Q${q.number}: total must be ${exp.total}, got ${total}/${q.totalMarks}.`);
  for (const profile of Object.keys(profiles)) if (profiles[profile] !== exp[profile]) errors.push(`Q${q.number}: ${profile} must be ${exp[profile]}, got ${profiles[profile]}.`);
  if (q.number === 1 && q.kind !== 'data_analysis') errors.push('Q1 must be data analysis.');
}
if (paper.durationSeconds !== 9000 || paper.totalMarks !== 100) errors.push('Expected 2h30 and 100 marks.');
for (const profile of Object.keys(overall)) if (overall[profile] !== paper.profileMarks?.[profile]) errors.push(`Overall ${profile} mismatch.`);
console.log(JSON.stringify({ valid: !errors.length, errors, questions: paper.questions?.length, overall }, null, 2)); if (errors.length) process.exit(1);
