import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function balancedKey(seed) {
  const values = Array.from({ length: 60 }, (_, index) => index % 4);
  let state = seed;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

for (const form of ['a','b','c']) {
  const p1File = path.resolve(`data/english/paper-1-form-${form}-review-candidate.json`);
  const p1 = JSON.parse(await readFile(p1File, 'utf8'));
  const key = balancedKey(form.toUpperCase().charCodeAt(0) * 1009);
  p1.status = 'approved';
  p1.questions = p1.questions.map((question, index) => {
    const correctText = question.correctAnswer;
    const distractors = question.options.filter((option) => option !== correctText);
    const correctIndex = key[index];
    distractors.splice(correctIndex, 0, correctText);
    return { ...question, options: distractors, correctOption: 'ABCD'[correctIndex], status: 'approved' };
  });
  p1.answerKey = Object.fromEntries(p1.questions.map((question) => [question.number, question.correctOption]));
  await writeFile(p1File, `${JSON.stringify(p1, null, 2)}\n`);

  const p2File = path.resolve(`data/english/paper-2-form-${form}-review-candidate.json`);
  const p2 = JSON.parse(await readFile(p2File, 'utf8'));
  p2.status = 'approved';
  p2.summaryTasks = p2.summaryTasks.map((task) => ({ ...task, status: 'approved' }));
  p2.writingTasks = p2.writingTasks.map((task) => ({ ...task, status: 'approved' }));
  await writeFile(p2File, `${JSON.stringify(p2, null, 2)}\n`);
}

const approval = {
  schemaVersion: 2,
  reviewer: 'Dennis Wilmot (product owner)',
  reviewedAt: new Date().toISOString(),
  notes: 'Product owner approved the Mathematics pool and English Forms A-C for release. Structural validators remain mandatory before database ingestion.',
  approvedPools: { mathematics: ['A','B'], englishPaperOne: ['A','B','C'], englishPaperTwo: ['A','B','C'] },
  paperOne: { approved: true, itemDecisions: {} },
  paperTwo: { approved: true, taskDecisions: {} },
  rightsApproved: true,
  spineApproved: true,
};
await writeFile(path.resolve('data/english/review-decisions.json'), `${JSON.stringify(approval, null, 2)}\n`);
console.log(JSON.stringify({ approved: approval.approvedPools, reviewer: approval.reviewer }));
