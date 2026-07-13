import { readFile } from 'node:fs/promises';
import path from 'node:path';
const file = path.resolve(process.argv[2]);
const paper = JSON.parse(await readFile(file, 'utf8'));
const errors = [];
if (paper.questions?.length !== 60) errors.push('Expected 60 questions.');
const numbers = new Set(); const labels = { A: 0, B: 0, C: 0, D: 0 }; const profiles = {};
for (const q of paper.questions || []) {
  if (numbers.has(q.number)) errors.push(`Duplicate Q${q.number}.`); numbers.add(q.number);
  if (q.options?.length !== 4 || new Set(q.options).size !== 4) errors.push(`Q${q.number}: expected four unique options.`);
  if (!q.options?.includes(q.correctAnswer)) errors.push(`Q${q.number}: correct answer absent from options.`);
  labels[q.correctOption] = (labels[q.correctOption] || 0) + 1; profiles[q.profile] = (profiles[q.profile] || 0) + 1;
  if (q.profile !== (q.number % 6 === 0 ? 'use_of_knowledge' : 'knowledge_comprehension')) errors.push(`Q${q.number}: profile schedule mismatch.`);
  if (/figure|diagram|graph|circuit|apparatus/i.test(q.stem) && !q.visualSpec) errors.push(`Q${q.number}: refers to a visual but has none.`);
}
if (profiles.knowledge_comprehension !== 50 || profiles.use_of_knowledge !== 10) errors.push('Expected KC/UK profile split 50/10.');
for (const label of Object.keys(labels)) if (labels[label] !== 15) errors.push(`Expected 15 correct ${label} labels.`);
console.log(JSON.stringify({ valid: !errors.length, errors, questions: paper.questions?.length, profiles, labels }, null, 2));
if (errors.length) process.exit(1);
