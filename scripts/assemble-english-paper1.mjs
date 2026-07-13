import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const modulePaths = [1, 2, 3].map((module) => path.resolve(`data/english/paper-1-module-${module}-review-candidate.json`));
const modules = await Promise.all(modulePaths.map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
const labels = ['A', 'B', 'C', 'D'];

const paper = {
  id: 'english-a-p1-2025-form-a-review-candidate',
  subject: 'English A',
  paper: 1,
  syllabusVersion: 'CXC-01-G-SYLL-25',
  durationSeconds: 5400,
  totalMarks: 60,
  questionCount: 60,
  status: 'review_pending',
  rights: 'original_generated_candidate',
  generatorModel: process.env.OPENROUTER_QUESTION_MODEL || 'openai/gpt-5-mini',
  modules: modules.map((batch, moduleIndex) => {
    const module = moduleIndex + 1;
    const stimulusIdMap = Object.fromEntries(batch.stimuli.map((stimulus) => [stimulus.id, `M${module}-${stimulus.id}`]));
    return {
      module,
      discourse: ['Informative Discourse', 'Literary Discourse', 'Persuasive Discourse'][moduleIndex],
      stimuli: batch.stimuli.map((stimulus) => ({ ...stimulus, id: stimulusIdMap[stimulus.id] })),
      questions: batch.questions.map((question) => ({
        ...question,
        id: `ENGA-P1-M${module}-Q${String(question.number).padStart(2, '0')}`,
        number: moduleIndex * 20 + question.number,
        moduleQuestionNumber: question.number,
        module,
        stimulusId: question.stimulusId ? stimulusIdMap[question.stimulusId] : null,
      })),
    };
  }),
};

paper.questions = paper.modules.flatMap((module) => module.questions);
paper.answerKey = Object.fromEntries(paper.questions.map((question) => [question.number, question.correctOption]));

const errors = [];
if (paper.questions.length !== 60) errors.push('Paper must contain 60 questions.');
if (new Set(paper.questions.map((question) => question.number)).size !== 60) errors.push('Question numbers must be unique.');
for (const module of paper.modules) {
  const discrete = module.questions.filter((question) => question.itemType === 'discrete').length;
  const comprehension = module.questions.filter((question) => question.itemType === 'comprehension').length;
  const profileCounts = module.questions.reduce((counts, question) => ({ ...counts, [question.profile]: (counts[question.profile] || 0) + 1 }), {});
  if (module.questions.length !== 20 || discrete !== 5 || comprehension !== 15) errors.push(`Module ${module.module} does not contain 5 discrete and 15 comprehension items.`);
  if (profileCounts.understanding !== 7 || profileCounts.analysing !== 7 || profileCounts.evaluating_creating !== 6) errors.push(`Module ${module.module} does not have profile balance 7/7/6.`);
}
const answerCounts = paper.questions.reduce((counts, question) => ({ ...counts, [question.correctOption]: (counts[question.correctOption] || 0) + 1 }), {});
if (labels.some((label) => answerCounts[label] !== 15)) errors.push('Answer positions are not balanced at 15 each.');
if (errors.length) throw new Error(errors.join('\n'));

await writeFile(path.resolve('data/english/paper-1-form-a-review-candidate.json'), `${JSON.stringify(paper, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ valid: true, questionCount: 60, moduleCounts: [20, 20, 20], answerCounts }));

