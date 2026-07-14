import paperOneModule from '../data/math-paper-1-demo';
import paperTwoModule from '../data/math-paper-2-demo';
import paperOneFormBModule from '../data/mathematics/paper-1-form-b-review-candidate';
import paperTwoFormBModule from '../data/mathematics/paper-2-form-b-review-candidate';

const { mathPaper1Demo } = paperOneModule;
const { mathPaper2Demo } = paperTwoModule;
const { mathPaper1FormB } = paperOneFormBModule;
const { mathPaper2FormB } = paperTwoFormBModule;

const issues = [];
const error = (code, message) => issues.push({ severity: 'error', code, message });
const warning = (code, message) => issues.push({ severity: 'warning', code, message });
const paperOneForms = [mathPaper1Demo, mathPaper1FormB];
const paperTwoForms = [mathPaper2Demo, mathPaper2FormB];

for (const form of paperOneForms) {
  if (form.questions.length !== 60) error('P1_COUNT', `${form.displayCode} has ${form.questions.length} questions.`);
  for (const module of [1, 2, 3]) {
    const questions = form.questions.filter((item) => item.module === module);
    if (questions.length !== 20) error('P1_MODULE_COUNT', `${form.displayCode} Module ${module} has ${questions.length} questions.`);
    const profiles = Object.fromEntries(['CK','AK','R'].map((profile) => [profile, questions.filter((item) => item.profile === profile).length]));
    if (profiles.CK !== 6 || profiles.AK !== 8 || profiles.R !== 6) error('P1_PROFILE_SHAPE', `${form.displayCode} Module ${module} profile shape is ${JSON.stringify(profiles)}.`);
  }
  for (const question of form.questions) {
    if (question.options.length !== 4 || !'ABCD'.includes(question.correctAnswer)) error('P1_OPTION_SHAPE', `${question.id} has an invalid option/key shape.`);
    if (new Set(question.options).size !== 4) error('P1_DUPLICATE_OPTION', `${question.id} contains duplicate options.`);
  }
}

for (const form of paperTwoForms) {
  if (form.questions.length !== 9) error('P2_COUNT', `${form.displayCode} has ${form.questions.length} questions.`);
  const totalMarks = form.questions.reduce((sum, question) => sum + question.marks, 0);
  if (totalMarks !== 90) error('P2_TOTAL_MARKS', `${form.displayCode} totals ${totalMarks} marks.`);
  for (const module of [1, 2, 3]) {
    const questions = form.questions.filter((item) => item.module === module);
    const marks = questions.reduce((sum, question) => sum + question.marks, 0);
    if (questions.length !== 3 || marks !== 30) error('P2_MODULE_SHAPE', `${form.displayCode} Module ${module} has ${questions.length} questions and ${marks} marks.`);
  }
  for (const question of form.questions) {
    const partMarks = question.parts.reduce((sum, part) => sum + part.marks, 0);
    if (partMarks !== question.marks) error('P2_PART_MARKS', `${question.id} parts total ${partMarks}, expected ${question.marks}.`);
    for (const part of question.parts) if (!part.prompt?.trim()) error('P2_EMPTY_PART', `${question.id}/${part.id} has no prompt.`);
  }
}

const prompts = [...paperOneForms.flatMap((form) => form.questions.map((item) => item.prompt)), ...paperTwoForms.flatMap((form) => form.questions.flatMap((item) => item.parts.map((part) => part.prompt)))];
if (new Set(prompts.map((prompt) => prompt.trim().toLowerCase())).size !== prompts.length) error('DUPLICATE_PROMPT', 'Exact duplicate prompts exist across the Mathematics forms.');
if (mathPaper1FormB.status !== 'approved' || mathPaper2FormB.status !== 'approved') error('APPROVAL_REQUIRED', 'Mathematics Form B has not been approved.');

const errors = issues.filter((issue) => issue.severity === 'error');
console.log(JSON.stringify({ valid: errors.length === 0, releaseReady: errors.length === 0, issues, summary: { paperOneCandidates: 120, paperTwoCandidates: 18, structuralErrors: errors.length } }, null, 2));
if (errors.length) process.exitCode = 1;
