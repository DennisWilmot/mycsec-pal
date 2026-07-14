import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_QUESTION_MODEL || 'openai/gpt-5-mini';
const form = String(process.argv[2] || 'A').toUpperCase();
if (!['A', 'B', 'C'].includes(form)) throw new Error('Form must be A, B or C.');
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required.');

const schema = {
  name: 'english_a_paper_2_candidate', strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['id', 'subject', 'paper', 'syllabusVersion', 'summaryTasks', 'writingTasks', 'validationNotes'],
    properties: {
      id: { type: 'string' }, subject: { type: 'string', const: 'English A' }, paper: { type: 'integer', const: 2 },
      syllabusVersion: { type: 'string', const: 'CXC-01-G-SYLL-25' },
      summaryTasks: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'number', 'module', 'discourse', 'extractTitle', 'extract', 'purposePrompt', 'purposeAnswer', 'summaryPrompt', 'acceptedPoints', 'sampleSummary', 'rights'],
          properties: {
            id: { type: 'string' }, number: { type: 'integer', enum: [1, 3, 6] }, module: { type: 'integer', enum: [1, 2, 3] },
            discourse: { type: 'string', enum: ['informative', 'literary', 'persuasive'] }, extractTitle: { type: 'string' }, extract: { type: 'string' },
            purposePrompt: { type: 'string' }, purposeAnswer: { type: 'string' }, summaryPrompt: { type: 'string' },
            acceptedPoints: { type: 'array', minItems: 4, maxItems: 6, items: { type: 'string' } }, sampleSummary: { type: 'string' },
            rights: { type: 'string', const: 'original_generated_candidate' }
          }
        }
      },
      writingTasks: {
        type: 'array', minItems: 4, maxItems: 4,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'number', 'module', 'kind', 'choiceGroup', 'scenario', 'task', 'requiredContent', 'audience', 'purpose', 'suggestedWords', 'visualSpec', 'rights'],
          properties: {
            id: { type: 'string' }, number: { type: 'integer', enum: [2, 4, 5, 7] }, module: { type: 'integer', enum: [1, 2, 3] },
            kind: { type: 'string', enum: ['informative_exposition', 'narrative_picture', 'narrative_sentence', 'persuasive_essay'] },
            choiceGroup: { type: ['string', 'null'] }, scenario: { type: 'string' }, task: { type: 'string' },
            requiredContent: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string' } }, audience: { type: 'string' }, purpose: { type: 'string' },
            suggestedWords: { type: 'object', additionalProperties: false, required: ['minimum', 'maximum'], properties: { minimum: { type: ['integer', 'null'] }, maximum: { type: ['integer', 'null'] } } },
            visualSpec: {
              anyOf: [
                { type: 'null' },
                { type: 'object', additionalProperties: false, required: ['type', 'description', 'elements', 'altText'], properties: { type: { type: 'string', const: 'picture_prompt' }, description: { type: 'string' }, elements: { type: 'array', items: { type: 'string' } }, altText: { type: 'string' } } }
              ]
            },
            rights: { type: 'string', const: 'original_generated_candidate' }
          }
        }
      },
      validationNotes: { type: 'array', items: { type: 'string' } }
    }
  }
};

const systemPrompt = `Create a complete ORIGINAL CSEC English A Paper 2 candidate package for the revised 2025 syllabus. Return only strict JSON.
Do not quote, reproduce, closely paraphrase or imitate any past-paper, specimen or subject-report passage, prompt or exemplar.
Create three original extract-and-summary tasks:
- Q1 Module 1 informative discourse: state writer purpose for 3 marks, then use three points in no more than 50 words for 7 marks.
- Q3 Module 2 literary discourse: describe setting for 3 marks, then use three experience points in no more than 50 words for 7 marks.
- Q6 Module 3 persuasive discourse: state writer purpose for 3 marks, then use three points in no more than 50 words for 7 marks.
Each extract should be 300-450 words and contain at least four independently expressible accepted points. Each sample summary must be no more than 50 words and use its own wording.
Create four 30-mark writing prompts:
- Q2 Module 1 informative exposition using an original practical scenario. Select one functional form from email, formal letter, report, notice or article and require relevant information, audience-aware format and continuous prose where appropriate.
- Q4 and Q5 Module 2 are alternatives in choiceGroup narrative-choice. Q4 uses an original declarative picture prompt; Q5 uses one original opening/turning-point sentence. Suggested length 400-450 words. Standard English is required; dialogue may use dialect.
- Q7 Module 3 is a balanced age-appropriate debatable statement. Require a minimum five-paragraph persuasive essay of 250-300 words in Standard English.
Use Caribbean-relevant contexts without requiring specialised island knowledge. Do not include unsafe, traumatic or discriminatory content. All records remain review candidates.`;

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'MyCSECPal English A Paper 2 generation' },
  body: JSON.stringify({ model, reasoning: { effort: 'low' }, temperature: 0.45, response_format: { type: 'json_schema', json_schema: schema }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate the complete Paper 2 candidate package now. Ensure each summary answer is supported exactly by its extract.' }] })
});
if (!response.ok) throw new Error(`OpenRouter generation failed with status ${response.status}: ${(await response.text()).slice(0, 800)}`);
const payload = await response.json();
const raw = JSON.parse(payload.choices?.[0]?.message?.content || 'null');
if (!raw) throw new Error('OpenRouter returned no candidate content.');

const summaryRubric = {
  maxMarks: 10,
  criteria: [
    { id: 'purpose-or-setting', profile: 'analysing', marks: 3, rule: 'Accurately addresses the required purpose or setting task.' },
    { id: 'three-supported-points', profile: 'understanding', marks: 3, rule: 'Awards one mark for each of three distinct supported points in the learner’s own words.' },
    { id: 'summary-language', profile: 'evaluating_creating', marks: 4, rule: 'Assesses concise expression, cohesion, grammar, mechanics and sentence linkages within the 50-word limit.' },
  ]
};
const compositionRubrics = {
  informative_exposition: { maxMarks: 30, criteria: [{ id: 'content-accuracy', profile: 'understanding', marks: 7 }, { id: 'format-audience-sequence', profile: 'analysing', marks: 7 }, { id: 'clarity-coherence-language', profile: 'evaluating_creating', marks: 16 }] },
  narrative: { maxMarks: 30, criteria: [{ id: 'language-narrative-understanding', profile: 'understanding', marks: 7 }, { id: 'organization-sequencing', profile: 'analysing', marks: 7 }, { id: 'stimulus-plot-characterization-style', profile: 'evaluating_creating', marks: 16 }] },
  persuasive_essay: { maxMarks: 30, criteria: [{ id: 'language-persuasive-understanding', profile: 'understanding', marks: 7 }, { id: 'argument-organization', profile: 'analysing', marks: 7 }, { id: 'position-evidence-audience-persuasion', profile: 'evaluating_creating', marks: 16 }] },
};
const candidate = {
  ...raw,
  id: `CSEC-ENGA-P2-2025-ORIG-FORM-${form}`,
  durationSeconds: 9900,
  totalMarksAnswered: 120,
  status: 'review_pending',
  summaryTasks: raw.summaryTasks.map((task) => ({ ...task, id: `ENGA-P2-F${form}-Q${task.number}`, marks: 10, maxSummaryWords: 50, rubric: summaryRubric })),
  writingTasks: raw.writingTasks.map((task) => ({ ...task, id: `ENGA-P2-F${form}-Q${task.number}`, marks: 30, rubric: task.kind === 'informative_exposition' ? compositionRubrics.informative_exposition : task.kind.startsWith('narrative_') ? compositionRubrics.narrative : compositionRubrics.persuasive_essay })),
};

const outputPath = path.resolve(`data/english/paper-2-form-${form.toLowerCase()}-review-candidate.json`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, model, form, summaryTasks: candidate.summaryTasks.length, writingTasks: candidate.writingTasks.length }));
