import { readFile } from 'node:fs/promises';
import path from 'node:path';

const input = path.resolve(process.argv[2] || 'tmp/english/english-paper2-review-candidate.json');
const paper = JSON.parse(await readFile(input, 'utf8'));
const errors = [];
const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

if (paper.summaryTasks?.length !== 3) errors.push('Expected three summary tasks.');
if (paper.writingTasks?.length !== 4) errors.push('Expected four printed writing prompts including two narrative alternatives.');
if (paper.durationSeconds !== 9900 || paper.totalMarksAnswered !== 120) errors.push('Expected 2h45 and 120 answered marks.');
const expectedSummary = new Map([[1, 1], [3, 2], [6, 3]]);
for (const task of paper.summaryTasks || []) {
  if (expectedSummary.get(task.number) !== task.module) errors.push(`${task.id}: invalid question/module mapping.`);
  if (wordCount(task.extract) < 250) errors.push(`${task.id}: extract is too short.`);
  if (wordCount(task.sampleSummary) > 50) errors.push(`${task.id}: sample summary exceeds 50 words.`);
  if (task.acceptedPoints.length < 4) errors.push(`${task.id}: requires at least four accepted source points.`);
  const marks = task.rubric.criteria.reduce((sum, criterion) => sum + criterion.marks, 0);
  if (marks !== 10) errors.push(`${task.id}: rubric does not total 10.`);
}
const tasks = Object.fromEntries((paper.writingTasks || []).map((task) => [task.number, task]));
for (const number of [2, 4, 5, 7]) if (!tasks[number]) errors.push(`Missing Question ${number}.`);
if (tasks[4]?.choiceGroup !== 'narrative-choice' || tasks[5]?.choiceGroup !== 'narrative-choice') errors.push('Questions 4 and 5 must share narrative-choice.');
if (!tasks[4]?.visualSpec || tasks[5]?.visualSpec !== null || tasks[7]?.visualSpec !== null) errors.push('Only Question 4 should have a picture stimulus specification.');
if (tasks[4]?.suggestedWords.minimum !== 400 || tasks[4]?.suggestedWords.maximum !== 450 || tasks[5]?.suggestedWords.minimum !== 400 || tasks[5]?.suggestedWords.maximum !== 450) errors.push('Narrative prompts must suggest 400-450 words.');
if (tasks[7]?.suggestedWords.minimum !== 250 || tasks[7]?.suggestedWords.maximum !== 300) errors.push('Persuasive essay must suggest 250-300 words.');
for (const task of paper.writingTasks || []) {
  if (task.rubric.criteria.reduce((sum, criterion) => sum + criterion.marks, 0) !== 30) errors.push(`${task.id}: rubric does not total 30.`);
}
const answeredMarks = 30 + 30 + 30 + paper.summaryTasks.reduce((sum, task) => sum + task.marks, 0);
if (answeredMarks !== 120) errors.push(`Answered route totals ${answeredMarks}, expected 120.`);

console.log(JSON.stringify({ valid: errors.length === 0, errors, summaryTasks: paper.summaryTasks?.length, writingTasks: paper.writingTasks?.length, answeredMarks }, null, 2));
if (errors.length) process.exit(1);

