import { readFile } from 'node:fs/promises';
import path from 'node:path';

const inputPath = path.resolve(process.argv[2] || 'tmp/english/english-paper1-module1-candidate.json');
const batch = JSON.parse(await readFile(inputPath, 'utf8'));
const expectedKinds = {
  1: ['informative_passage', 'visual_information'],
  2: ['literary_extract', 'original_poem'],
  3: ['persuasive_extract', 'visual_persuasive'],
}[batch.module];
const errors = [];
const counts = (values) => values.reduce((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {});

if (batch.questions?.length !== 20) errors.push('Batch must contain exactly 20 questions.');
const numbers = batch.questions.map((question) => question.number);
if (new Set(numbers).size !== 20 || Math.min(...numbers) !== 1 || Math.max(...numbers) !== 20) errors.push('Question numbers must be unique from 1 to 20.');
const typeCounts = counts(batch.questions.map((question) => question.itemType));
if (typeCounts.discrete !== 5 || typeCounts.comprehension !== 15) errors.push('Expected 5 discrete and 15 comprehension items.');
const profileCounts = counts(batch.questions.map((question) => question.profile));
if (profileCounts.understanding !== 7 || profileCounts.analysing !== 7 || profileCounts.evaluating_creating !== 6) errors.push('Expected profile balance 7/7/6.');
const stimuli = Object.fromEntries(batch.stimuli.map((stimulus) => [stimulus.id, stimulus]));
const comprehensionByStimulus = counts(batch.questions.filter((question) => question.itemType === 'comprehension').map((question) => question.stimulusId));
const stimulusKinds = Object.values(stimuli).map((stimulus) => stimulus.kind).sort().join(',');
if (!expectedKinds || stimulusKinds !== [...expectedKinds].sort().join(',')) errors.push(`Unexpected stimulus types for Module ${batch.module}.`);
const comprehensionCounts = Object.values(comprehensionByStimulus).sort((a, b) => a - b);
if (comprehensionCounts.join(',') !== '7,8') errors.push('Expected a 7/8 comprehension split across the two stimuli.');

for (const question of batch.questions) {
  if (!Array.isArray(question.options) || question.options.length !== 4 || new Set(question.options).size !== 4) errors.push(`${question.id}: options must be four distinct values.`);
  if (!['A', 'B', 'C', 'D'].includes(question.correctOption)) errors.push(`${question.id}: invalid correct option.`);
  const keyedAnswer = question.options[['A', 'B', 'C', 'D'].indexOf(question.correctOption)];
  if (keyedAnswer !== question.correctAnswer) errors.push(`${question.id}: keyed option does not match correct answer text.`);
  if (question.itemType === 'discrete' && question.stimulusId !== null) errors.push(`${question.id}: discrete item should not reference a stimulus.`);
  if (question.itemType === 'comprehension' && !stimuli[question.stimulusId]) errors.push(`${question.id}: missing stimulus reference.`);
  if (!Array.isArray(question.distractorRationales) || question.distractorRationales.length !== 3) errors.push(`${question.id}: expected three distractor rationales.`);
}
for (const stimulus of batch.stimuli) {
  if (stimulus.kind.startsWith('visual_') && !stimulus.visualSpec) errors.push(`${stimulus.id}: visual stimulus requires a visual specification.`);
  if (!stimulus.kind.startsWith('visual_') && !stimulus.content) errors.push(`${stimulus.id}: text stimulus requires content.`);
}

console.log(JSON.stringify({ valid: errors.length === 0, errors, questionCount: batch.questions.length, typeCounts, profileCounts, comprehensionByStimulus }, null, 2));
if (errors.length) process.exit(1);
