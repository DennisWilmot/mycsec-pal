import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const subjectKey = (process.argv[2] || '').toLowerCase();
const configs = { chemistry: { subject: 'Chemistry', batches: 3 }, physics: { subject: 'Physics', batches: 5 } };
const config = configs[subjectKey];
if (!config) throw new Error('Subject must be chemistry or physics.');
const batches = await Promise.all(Array.from({ length: config.batches }, (_, i) => readFile(path.resolve(`tmp/${subjectKey}/${subjectKey}-paper1-batch-${i + 1}.json`), 'utf8').then(JSON.parse)));
const questions = batches.flatMap((b) => b.questions).sort((a, b) => a.number - b.number);
const paper = { id: `${subjectKey}-paper-1-form-a`, subject: config.subject, paper: 1, form: 'A', durationSeconds: 4500, questionCount: 60, totalMarks: 60, status: 'review_pending', questions };
const output = path.resolve(`data/${subjectKey}/paper-1-form-a-review-candidate.json`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(paper, null, 2)}\n`);
console.log(JSON.stringify({ output, questions: questions.length }));
