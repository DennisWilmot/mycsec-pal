import { mathPaper1Demo } from '../../data/math-paper-1-demo';
import { mathPaper2Demo } from '../../data/math-paper-2-demo';

export const mathematicsSubjectSeed = Object.freeze({
  id: 'csec-mathematics',
  code: 'CSEC-MATH',
  name: 'Mathematics',
  awardingBody: 'CXC',
  qualification: 'CSEC',
  active: true,
});

export const mathematics2027SyllabusSeed = Object.freeze({
  id: 'csec-mathematics-may-june-2027',
  subjectId: mathematicsSubjectSeed.id,
  name: 'CSEC Mathematics syllabus',
  era: 'may-june-2027-onward',
  version: 'amended-october-2025',
  effectiveFrom: '2027-05-01',
});

const topic = (module, name, paper1Items) => ({
  id: `math-2027-m${module}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
  syllabusId: mathematics2027SyllabusSeed.id,
  module,
  name,
  paper1Items,
});

export const mathematics2027TopicsSeed = Object.freeze([
  topic(1, 'Number Theory and Computation', 4),
  topic(1, 'Consumer Arithmetic', 4),
  topic(1, 'Sets', 3),
  topic(1, 'Measurement', 4),
  topic(1, 'Algebra 1', 3),
  topic(1, 'Introduction to Graphs', 2),
  topic(2, 'Statistics 1', 4),
  topic(2, 'Algebra 2', 4),
  topic(2, 'Relations, Functions and Graphs 1', 4),
  topic(2, 'Geometry and Trigonometry 1', 4),
  topic(2, 'Vectors and Matrices 1', 4),
  topic(3, 'Statistics 2', 4),
  topic(3, 'Relations, Functions and Graphs 2', 6),
  topic(3, 'Geometry and Trigonometry 2', 6),
  topic(3, 'Vectors and Matrices 2', 4),
]);

export const mathematics2027PaperDefinitionsSeed = Object.freeze([
  {
    id: 'math-p1-2027-v1',
    syllabusId: mathematics2027SyllabusSeed.id,
    paperNumber: 1,
    name: 'Mathematics Paper 1',
    durationSeconds: 5400,
    questionCount: 60,
    totalMarks: 60,
    moduleQuestionTargets: { 1: 20, 2: 20, 3: 20 },
    profileTargetsPerModule: { CK: 6, AK: 8, R: 6 },
  },
  {
    id: 'math-p2-2027-v1',
    syllabusId: mathematics2027SyllabusSeed.id,
    paperNumber: 2,
    name: 'Mathematics Paper 2',
    durationSeconds: 9600,
    questionCount: 9,
    totalMarks: 90,
    moduleQuestionTargets: { 1: 3, 2: 3, 3: 3 },
    moduleMarkTargets: { 1: 30, 2: 30, 3: 30 },
  },
]);

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

export const paper1QuestionSeed = Object.freeze(mathPaper1Demo.questions.map((question) => ({
  externalId: question.id,
  paperDefinitionId: 'math-p1-2027-v1',
  number: question.number,
  module: question.module,
  topic: question.topic,
  objective: question.objective,
  profile: question.profile,
  difficulty: question.difficulty,
  prompt: question.prompt,
  options: clone(question.options),
  correctAnswer: question.correctAnswer,
  visualSpec: clone(question.visual),
  marks: 1,
  publicationStatus: question.status,
})));

export const paper2QuestionSeed = Object.freeze(mathPaper2Demo.questions.map((question) => ({
  externalId: question.id,
  paperDefinitionId: 'math-p2-2027-v1',
  number: question.number,
  module: question.module,
  internalTitle: question.title,
  marks: question.marks,
  publicationStatus: mathPaper2Demo.status,
  parts: question.parts.map((item, position) => ({
    externalId: item.id,
    position: position + 1,
    label: item.label,
    prompt: item.prompt,
    marks: item.marks,
    responseType: item.responseType,
    visualSpec: clone(item.visual),
  })),
})));

const groupCount = (items, key) => items.reduce((counts, item) => {
  const value = String(item[key]);
  counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}, {});

const equalCounts = (actual, expected) => Object.entries(expected)
  .every(([key, value]) => actual[key] === value);

export function validatePaper1Seed(questions = paper1QuestionSeed) {
  const errors = [];
  const definition = mathematics2027PaperDefinitionsSeed[0];
  const topicTargets = Object.fromEntries(mathematics2027TopicsSeed.map((item) => [item.name, item.paper1Items]));
  const topicCounts = groupCount(questions, 'topic');
  const moduleCounts = groupCount(questions, 'module');
  const profileCountsByModule = Object.fromEntries([1, 2, 3].map((module) => [
    module,
    groupCount(questions.filter((question) => question.module === module), 'profile'),
  ]));

  if (questions.length !== definition.questionCount) errors.push(`Expected 60 questions; received ${questions.length}.`);
  if (!equalCounts(moduleCounts, definition.moduleQuestionTargets)) errors.push('Paper 1 module allocation is not 20/20/20.');
  if (!equalCounts(topicCounts, topicTargets)) errors.push('Paper 1 topic allocation does not match the 2027 blueprint.');
  for (const module of [1, 2, 3]) {
    if (!equalCounts(profileCountsByModule[module], definition.profileTargetsPerModule)) {
      errors.push(`Module ${module} profile allocation is not CK 6 / AK 8 / R 6.`);
    }
  }
  questions.forEach((question) => {
    if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) errors.push(`${question.externalId} has an invalid answer key.`);
    if (!Array.isArray(question.options) || question.options.length !== 4) errors.push(`${question.externalId} must have four options.`);
  });

  return { valid: errors.length === 0, errors, questionCount: questions.length, moduleCounts, topicCounts, profileCountsByModule };
}

export function validatePaper2Seed(questions = paper2QuestionSeed) {
  const errors = [];
  const definition = mathematics2027PaperDefinitionsSeed[1];
  const moduleCounts = groupCount(questions, 'module');
  const moduleMarks = questions.reduce((totals, question) => {
    totals[question.module] = (totals[question.module] ?? 0) + question.marks;
    return totals;
  }, {});
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);

  if (questions.length !== definition.questionCount) errors.push(`Expected 9 questions; received ${questions.length}.`);
  if (totalMarks !== definition.totalMarks) errors.push(`Expected 90 marks; received ${totalMarks}.`);
  if (!equalCounts(moduleCounts, definition.moduleQuestionTargets)) errors.push('Paper 2 module question allocation is not 3/3/3.');
  if (!equalCounts(moduleMarks, definition.moduleMarkTargets)) errors.push('Paper 2 module mark allocation is not 30/30/30.');
  questions.forEach((question) => {
    const partMarks = question.parts.reduce((sum, item) => sum + item.marks, 0);
    if (partMarks !== question.marks) errors.push(`${question.externalId} part marks total ${partMarks}, expected ${question.marks}.`);
  });

  return { valid: errors.length === 0, errors, questionCount: questions.length, totalMarks, moduleCounts, moduleMarks };
}

export function validateMathematicsSeed() {
  const paper1 = validatePaper1Seed();
  const paper2 = validatePaper2Seed();
  return { valid: paper1.valid && paper2.valid, paper1, paper2 };
}

export const mathematicsSeedData = Object.freeze({
  subject: mathematicsSubjectSeed,
  syllabus: mathematics2027SyllabusSeed,
  topics: mathematics2027TopicsSeed,
  paperDefinitions: mathematics2027PaperDefinitionsSeed,
  paper1Questions: paper1QuestionSeed,
  paper2Questions: paper2QuestionSeed,
});
