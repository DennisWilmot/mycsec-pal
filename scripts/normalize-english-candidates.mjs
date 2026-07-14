import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const profileSchedule = ['understanding','analysing','evaluating_creating','understanding','analysing','evaluating_creating','understanding','analysing','evaluating_creating','understanding','analysing','evaluating_creating','understanding','analysing','evaluating_creating','understanding','analysing','evaluating_creating','understanding','analysing'];
for (const form of ['b','c']) {
  for (const module of [1,2,3]) {
    const file = path.resolve(`tmp/english/form-${form}/paper1-module${module}-candidate.json`);
    const candidate = JSON.parse(await readFile(file, 'utf8'));
    candidate.questions = candidate.questions.map((question) => ({ ...question, profile: profileSchedule[question.number - 1] }));
    await writeFile(file, `${JSON.stringify(candidate, null, 2)}\n`);
  }
  const paperTwoFile = path.resolve(`data/english/paper-2-form-${form}-review-candidate.json`);
  const paperTwo = JSON.parse(await readFile(paperTwoFile, 'utf8'));
  paperTwo.writingTasks = paperTwo.writingTasks.map((task) => task.number === 5 ? { ...task, visualSpec: null } : task);
  await writeFile(paperTwoFile, `${JSON.stringify(paperTwo, null, 2)}\n`);
}
console.log(JSON.stringify({ normalizedForms: ['B','C'], profileSchedule: '7/7/6', narrativeSentenceVisual: null }));
