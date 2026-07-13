import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_QUESTION_MODEL || 'openai/gpt-5-mini';
const moduleNumber = Number(process.argv[2] || 1);

const moduleConfig = {
  1: {
    discourse: 'Informative Discourse',
    stimulusInstruction: 'Stimulus A is an informative passage and has 8 items. Stimulus B is a declarative visual-information specification (table/chart/form/map/notice) and has 7 items.',
    kinds: ['informative_passage', 'visual_information'],
  },
  2: {
    discourse: 'Literary Discourse',
    stimulusInstruction: 'Stimulus A is an original poem of 20-28 lines and has 8 items. Stimulus B is an original literary prose extract of 500-650 words and has 7 items. Both must be entirely original.',
    kinds: ['original_poem', 'literary_extract'],
  },
  3: {
    discourse: 'Persuasive Discourse',
    stimulusInstruction: 'Stimulus A is an original persuasive extract such as a speech, editorial or letter and has 8 items. Stimulus B is a declarative visual persuasive text such as an advertisement, campaign notice or infographic and has 7 items.',
    kinds: ['persuasive_extract', 'visual_persuasive'],
  },
};

const activeModule = moduleConfig[moduleNumber];
if (!activeModule) throw new Error('Module must be 1, 2 or 3.');

if (!apiKey) throw new Error('OPENROUTER_API_KEY is required.');

const outputPath = path.resolve(`tmp/english/english-paper1-module${moduleNumber}-candidate.json`);

const systemPrompt = `You create ORIGINAL candidate questions for a commercial CSEC English A practice product.
Return only JSON matching the requested schema. Do not quote, reproduce, paraphrase closely, or imitate any past-paper or subject-report passage.
The revised 2025 syllabus is authoritative.
This is Paper 1 Module ${moduleNumber}: ${activeModule.discourse}.
Create exactly 20 four-option multiple-choice items: 5 discrete language items and 15 comprehension items based on exactly two original stimuli.
${activeModule.stimulusInstruction}
Use this exact profile schedule: Q1 understanding, Q2 analysing, Q3 evaluating_creating, Q4 understanding, Q5 analysing, Q6 evaluating_creating, Q7 understanding, Q8 analysing, Q9 evaluating_creating, Q10 understanding, Q11 analysing, Q12 evaluating_creating, Q13 understanding, Q14 analysing, Q15 evaluating_creating, Q16 understanding, Q17 analysing, Q18 evaluating_creating, Q19 understanding, Q20 analysing.
Keep contexts culturally inclusive and avoid requiring specialised local knowledge.
Every item must have exactly one defensible answer supported by the item or stimulus. Supply the correct answer text separately from three distractors. Do not assign A-D labels; application code does that deterministically.
Difficulty is a separate predicted label: easy, medium or hard.
Status must be review_pending.`;

const schema = {
  name: `english_a_module_${moduleNumber}_candidate_batch`,
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['batchId', 'subject', 'paper', 'module', 'stimuli', 'questions', 'validationNotes'],
    properties: {
      batchId: { type: 'string' },
      subject: { type: 'string', const: 'English A' },
      paper: { type: 'integer', const: 1 },
      module: { type: 'integer', const: moduleNumber },
      stimuli: {
        type: 'array', minItems: 2, maxItems: 2,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'kind', 'title', 'content', 'visualSpec', 'rights'],
          properties: {
            id: { type: 'string' },
            kind: { type: 'string', enum: activeModule.kinds },
            title: { type: 'string' },
            content: { type: ['string', 'null'] },
            visualSpec: {
              anyOf: [
                { type: 'null' },
                {
                  type: 'object', additionalProperties: false,
                  required: ['type', 'title', 'headers', 'rows'],
                  properties: {
                    type: { type: 'string', enum: ['table', 'chart_data', 'form', 'notice'] },
                    title: { type: 'string' },
                    headers: { type: 'array', items: { type: 'string' } },
                    rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
                  }
                }
              ]
            },
            rights: { type: 'string', const: 'original_generated_candidate' }
          }
        }
      },
      questions: {
        type: 'array', minItems: 20, maxItems: 20,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'number', 'itemType', 'stimulusId', 'objective', 'profile', 'difficulty', 'stem', 'correctAnswer', 'answerRationale', 'distractors', 'status'],
          properties: {
            id: { type: 'string' }, number: { type: 'integer', minimum: 1, maximum: 20 },
            itemType: { enum: ['discrete', 'comprehension'] },
            stimulusId: { type: ['string', 'null'] }, objective: { type: 'string' },
            profile: { enum: ['understanding', 'analysing', 'evaluating_creating'] },
            difficulty: { enum: ['easy', 'medium', 'hard'] }, stem: { type: 'string' },
            correctAnswer: { type: 'string' }, answerRationale: { type: 'string' },
            distractors: {
              type: 'array', minItems: 3, maxItems: 3,
              items: {
                type: 'object', additionalProperties: false,
                required: ['text', 'rationale'],
                properties: { text: { type: 'string' }, rationale: { type: 'string' } }
              }
            },
            status: { type: 'string', const: 'review_pending' }
          }
        }
      },
      validationNotes: { type: 'array', items: { type: 'string' } }
    }
  }
};

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'MyCSECPal English A question generation'
  },
  body: JSON.stringify({
    model,
    reasoning: { effort: 'low' },
    temperature: 0.4,
    response_format: { type: 'json_schema', json_schema: schema },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the complete Module ${moduleNumber} candidate batch now. Avoid unsupported inferences and ambiguous vocabulary questions.` }
    ]
  })
});

if (!response.ok) {
  const providerMessage = await response.text();
  throw new Error(`OpenRouter generation failed with status ${response.status}: ${providerMessage.slice(0, 800)}`);
}
const payload = await response.json();
const content = payload.choices?.[0]?.message?.content;
if (!content) throw new Error('OpenRouter returned no candidate content.');
const rawCandidate = JSON.parse(content);
const optionLabels = ['A', 'B', 'C', 'D'];
const candidate = {
  ...rawCandidate,
  questions: rawCandidate.questions.map((question) => {
    const correctIndex = (question.number - 1) % 4;
    const options = question.distractors.map((item) => item.text);
    options.splice(correctIndex, 0, question.correctAnswer);
    return {
      id: question.id,
      number: question.number,
      itemType: question.itemType,
      stimulusId: question.stimulusId,
      objective: question.objective,
      profile: question.profile,
      difficulty: question.difficulty,
      stem: question.stem,
      options,
      correctOption: optionLabels[correctIndex],
      correctAnswer: question.correctAnswer,
      answerRationale: question.answerRationale,
      distractorRationales: question.distractors.map((item) => item.rationale),
      status: question.status,
    };
  })
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, model, questionCount: candidate.questions?.length ?? 0 }));
