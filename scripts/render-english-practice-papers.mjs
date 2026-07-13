import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), 'utf8'));
const paper1 = await readJson('data/english/paper-1-form-a-review-candidate.json');
const paper2 = await readJson('data/english/paper-2-form-a-review-candidate.json');
const outputDir = path.resolve('docs/generated');
await mkdir(outputDir, { recursive: true });

const tableMarkdown = (spec) => {
  if (!spec) return '';
  const header = `| ${spec.headers.join(' | ')} |`;
  const separator = `| ${spec.headers.map(() => '---').join(' | ')} |`;
  const rows = spec.rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return `\n**${spec.title}**\n\n${header}\n${separator}\n${rows}\n`;
};

const p1 = [`# English A Practice Paper 1 - Form A`, ``, `Status: review candidate`, `Time: 1 hour 30 minutes`, `Questions: 60 compulsory multiple-choice items`, ``, `Choose the best answer for each question.`];
for (const module of paper1.modules) {
  p1.push('', `## Module ${module.module}: ${module.discourse}`);
  const stimuli = Object.fromEntries(module.stimuli.map((stimulus) => [stimulus.id, stimulus]));
  let lastStimulus = null;
  for (const question of module.questions) {
    if (question.stimulusId && question.stimulusId !== lastStimulus) {
      const stimulus = stimuli[question.stimulusId];
      p1.push('', `### Stimulus: ${stimulus.title}`, '');
      if (stimulus.content) p1.push(stimulus.content, '');
      if (stimulus.visualSpec) p1.push(tableMarkdown(stimulus.visualSpec));
      lastStimulus = question.stimulusId;
    }
    p1.push(`**${question.number}. ${question.stem}**`, '');
    question.options.forEach((option, index) => p1.push(`${['A', 'B', 'C', 'D'][index]}. ${option}`));
    p1.push('');
  }
}

const p1Key = [`# English A Practice Paper 1 - Form A: Reviewer Key`, ``, `Status: review candidate - not approved for learners`, ``];
for (const question of paper1.questions) p1Key.push(`- **${question.number}. ${question.correctOption}** - ${question.answerRationale}`);

const p2 = [`# English A Practice Paper 2 - Form A`, ``, `Status: review candidate`, `Time: 2 hours 45 minutes`, `Marks answered: 120`, ``, `Answer Questions 1, 2, 3, either 4 or 5, 6, and 7.`];
const summaries = Object.fromEntries(paper2.summaryTasks.map((task) => [task.number, task]));
const writings = Object.fromEntries(paper2.writingTasks.map((task) => [task.number, task]));
for (const number of [1, 2, 3, 4, 5, 6, 7]) {
  const summary = summaries[number];
  const writing = writings[number];
  if (summary) {
    p2.push('', `## Question ${number} - Module ${summary.module}`, '', `### ${summary.extractTitle}`, '', summary.extract, '', `**(a)** ${summary.purposePrompt} **(3 marks)**`, '', `**(b)** ${summary.summaryPrompt} Use three points and no more than 50 words. **(7 marks)**`, '', `**Total: 10 marks**`);
  }
  if (writing) {
    p2.push('', `## Question ${number} - Module ${writing.module}${writing.choiceGroup ? ' (alternative)' : ''}`, '', writing.scenario, '');
    if (writing.visualSpec) p2.push(`**Picture description:** ${writing.visualSpec.description}`, '', `Elements: ${writing.visualSpec.elements.join('; ')}`, '');
    p2.push(`**Task:** ${writing.task}`, '');
    if (writing.requiredContent.length) p2.push('Your response should:', ...writing.requiredContent.map((item) => `- ${item}`), '');
    if (writing.suggestedWords.minimum) p2.push(`Suggested length: ${writing.suggestedWords.minimum}-${writing.suggestedWords.maximum} words.`, '');
    p2.push(`**Total: 30 marks**`);
  }
}

const p2Guide = [`# English A Practice Paper 2 - Form A: Marking Guide`, ``, `Status: review candidate - requires qualified English review`, ``];
for (const task of paper2.summaryTasks) {
  p2Guide.push(`## Question ${task.number}`, '', `**Purpose/setting answer:** ${task.purposeAnswer}`, '', '**Accepted summary points:**', ...task.acceptedPoints.map((point) => `- ${point}`), '', `**Sample summary (${task.sampleSummary.trim().split(/\s+/).length} words):** ${task.sampleSummary}`, '', '**Rubric:**', ...task.rubric.criteria.map((criterion) => `- ${criterion.marks} marks - ${criterion.profile}: ${criterion.rule}`), '');
}
for (const task of paper2.writingTasks) {
  p2Guide.push(`## Question ${task.number}`, '', ...task.rubric.criteria.map((criterion) => `- ${criterion.marks} marks - ${criterion.profile}: ${criterion.id}`), '');
}

const outputs = [
  ['english-a-paper-1-form-a-review.md', p1],
  ['english-a-paper-1-form-a-key.md', p1Key],
  ['english-a-paper-2-form-a-review.md', p2],
  ['english-a-paper-2-form-a-marking-guide.md', p2Guide],
];
for (const [filename, lines] of outputs) await writeFile(path.join(outputDir, filename), `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ generated: outputs.map(([filename]) => filename) }));

