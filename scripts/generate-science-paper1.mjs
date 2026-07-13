import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const subjectKey = (process.argv[2] || '').toLowerCase();
const batchNumber = Number(process.argv[3] || 1);
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_QUESTION_MODEL || 'openai/gpt-5-mini';
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required.');

const configs = {
  chemistry: {
    subject: 'Chemistry', batches: 3, batchSize: 20,
    sections: ['Principles of Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'],
    topics: [
      'states and particulate nature of matter', 'mixtures and separation', 'atomic structure',
      'periodicity and bonding', 'formulae equations and mole calculations', 'acids bases and salts',
      'oxidation reduction and electrolysis', 'rates equilibrium and energetics',
      'organic families nomenclature reactions and polymers', 'metals reactivity extraction and corrosion',
      'non-metals environmental chemistry and qualitative analysis',
    ],
    visuals: ['table', 'graph', 'apparatus', 'particle_model', 'structural_formula', 'reaction_scheme'],
  },
  physics: {
    subject: 'Physics', batches: 5, batchSize: 12,
    sections: ['Mechanics', 'Thermal Physics and Kinetic Theory', 'Waves and Optics', 'Electricity and Magnetism', 'The Physics of the Atom'],
    topics: [
      'measurement units scalars and vectors', 'motion graphs forces moments and equilibrium',
      'work energy power pressure and machines', 'temperature thermal expansion heat capacity and transfer',
      'kinetic theory and gas behaviour', 'wave properties sound electromagnetic spectrum and light',
      'reflection refraction lenses and optical instruments', 'electrostatics current voltage resistance and circuits',
      'electrical energy power household safety and electronics', 'magnetism electromagnetism motors generators and transformers',
      'atomic structure radioactivity nuclear energy and safety',
    ],
    visuals: ['table', 'graph', 'apparatus', 'circuit', 'ray_diagram', 'force_diagram', 'wave_diagram'],
  },
};
const config = configs[subjectKey];
if (!config) throw new Error('Subject must be chemistry or physics.');
if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > config.batches) throw new Error(`Batch must be 1-${config.batches}.`);

const firstNumber = (batchNumber - 1) * config.batchSize + 1;
const lastNumber = firstNumber + config.batchSize - 1;
const profileFor = (n) => n % 6 === 0 ? 'use_of_knowledge' : 'knowledge_comprehension';
const schedule = Array.from({ length: config.batchSize }, (_, i) => {
  const number = firstNumber + i;
  return `Q${number} ${profileFor(number)}`;
}).join(', ');

const schema = {
  name: `${subjectKey}_paper_1_batch_${batchNumber}`, strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['batchId', 'subject', 'paper', 'batch', 'questions', 'validationNotes'],
    properties: {
      batchId: { type: 'string' }, subject: { type: 'string', const: config.subject },
      paper: { type: 'integer', const: 1 }, batch: { type: 'integer', const: batchNumber },
      questions: {
        type: 'array', minItems: config.batchSize, maxItems: config.batchSize,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'number', 'syllabusSection', 'topic', 'objective', 'profile', 'difficulty', 'stem', 'visualSpec', 'correctAnswer', 'answerRationale', 'distractors', 'status'],
          properties: {
            id: { type: 'string' }, number: { type: 'integer', minimum: firstNumber, maximum: lastNumber },
            syllabusSection: { type: 'string', enum: config.sections }, topic: { type: 'string' }, objective: { type: 'string' },
            profile: { type: 'string', enum: ['knowledge_comprehension', 'use_of_knowledge'] },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }, stem: { type: 'string' },
            visualSpec: {
              anyOf: [
                { type: 'null' },
                { type: 'object', additionalProperties: false, required: ['type', 'description', 'labels', 'data'], properties: {
                  type: { type: 'string', enum: config.visuals }, description: { type: 'string' },
                  labels: { type: 'array', items: { type: 'string' } }, data: { type: 'array', items: { type: 'string' } },
                } },
              ],
            },
            correctAnswer: { type: 'string' }, answerRationale: { type: 'string' },
            distractors: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['text', 'rationale'], properties: { text: { type: 'string' }, rationale: { type: 'string' } } } },
            status: { type: 'string', const: 'review_pending' },
          },
        },
      },
      validationNotes: { type: 'array', items: { type: 'string' } },
    },
  },
};

const system = `Create ORIGINAL CSEC ${config.subject} Paper 1 candidate questions for a commercial practice product. Return strict JSON only.
The syllabus is authoritative. Never reproduce, closely paraphrase, or transform a recognisable past-paper question.
This batch contains questions ${firstNumber}-${lastNumber} of a 60-question paper. Exact profile schedule: ${schedule}.
Across the batch, cover these syllabus sections: ${config.sections.join('; ')}. Draw broadly from: ${config.topics.join('; ')}.
Use SI units and scientifically correct notation. Every question must have exactly one defensible answer. Supply the correct answer text separately from three plausible misconception-based distractors; do not assign A-D labels.
Use an original declarative visualSpec only when the item genuinely requires a diagram, graph, apparatus, structure, circuit, ray or data display. About 20-30% of the complete paper should use visualSpec; never refer to a figure when visualSpec is null.
Difficulty across the batch should be approximately 20% easy, 60% medium, 20% hard. Calculations must be independently checked. Avoid trick wording and avoid requiring unstated constants. Status is review_pending.`;

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': `MyCSECPal ${config.subject} generation` },
  body: JSON.stringify({ model, reasoning: { effort: 'low' }, temperature: 0.35, response_format: { type: 'json_schema', json_schema: schema }, messages: [{ role: 'system', content: system }, { role: 'user', content: `Generate batch ${batchNumber}. Ensure numerical answers and rationales agree exactly.` }] }),
});
if (!response.ok) throw new Error(`OpenRouter failed (${response.status}): ${(await response.text()).slice(0, 1000)}`);
const payload = await response.json();
const raw = JSON.parse(payload.choices?.[0]?.message?.content || 'null');
if (!raw) throw new Error('OpenRouter returned no JSON.');
const labels = ['A', 'B', 'C', 'D'];
const questions = raw.questions.map((q) => {
  const correctIndex = (q.number - 1) % 4;
  const options = q.distractors.map((d) => d.text);
  options.splice(correctIndex, 0, q.correctAnswer);
  return { ...q, options, correctOption: labels[correctIndex], distractorRationales: q.distractors.map((d) => d.rationale), distractors: undefined };
});
const outputPath = path.resolve(`tmp/${subjectKey}/${subjectKey}-paper1-batch-${batchNumber}.json`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ ...raw, questions }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, model, questions: questions.length }));
