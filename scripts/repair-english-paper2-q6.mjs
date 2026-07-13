import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.resolve('tmp/english/english-paper2-review-candidate.json');
const paper = JSON.parse(await readFile(file, 'utf8'));
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_QUESTION_MODEL || 'openai/gpt-5-mini';
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required.');

const schema = {
  name: 'english_a_paper_2_q6_repair', strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['id', 'number', 'module', 'discourse', 'extractTitle', 'extract', 'purposePrompt', 'purposeAnswer', 'summaryPrompt', 'acceptedPoints', 'sampleSummary', 'rights'],
    properties: {
      id: { type: 'string' }, number: { type: 'integer', const: 6 }, module: { type: 'integer', const: 3 }, discourse: { type: 'string', const: 'persuasive' },
      extractTitle: { type: 'string' }, extract: { type: 'string' }, purposePrompt: { type: 'string' }, purposeAnswer: { type: 'string' }, summaryPrompt: { type: 'string' },
      acceptedPoints: { type: 'array', minItems: 4, maxItems: 6, items: { type: 'string' } }, sampleSummary: { type: 'string' }, rights: { type: 'string', const: 'original_generated_candidate' }
    }
  }
};

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'MyCSECPal English A Q6 repair' },
  body: JSON.stringify({ model, reasoning: { effort: 'low' }, temperature: 0.4, response_format: { type: 'json_schema', json_schema: schema }, messages: [
    { role: 'system', content: `Create one entirely ORIGINAL 300-400 word persuasive extract for Caribbean secondary students. It must take a clear, age-appropriate position, use multiple reasons/evidence, acknowledge a counterargument, and end with a call to action. Do not imitate any existing exam passage. Provide a precise writer-purpose answer, 4-6 supported points, and a coherent own-words sample summary of no more than 50 words. This is CSEC English A Paper 2 Question 6, Module 3 Persuasive Discourse.` },
    { role: 'user', content: 'Generate the replacement task. Keep every accepted point explicitly supported by the extract.' }
  ] })
});
if (!response.ok) throw new Error(`OpenRouter repair failed with status ${response.status}: ${(await response.text()).slice(0, 800)}`);
const payload = await response.json();
const replacement = JSON.parse(payload.choices?.[0]?.message?.content || 'null');
if (!replacement) throw new Error('No replacement returned.');
const existing = paper.summaryTasks.find((task) => task.number === 6);
paper.summaryTasks = paper.summaryTasks.map((task) => task.number === 6 ? { ...replacement, marks: 10, maxSummaryWords: 50, rubric: existing.rubric } : task);
await writeFile(file, `${JSON.stringify(paper, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ repaired: 6, model }));

