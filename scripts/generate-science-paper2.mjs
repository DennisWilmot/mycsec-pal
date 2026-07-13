import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const subjectKey = (process.argv[2] || '').toLowerCase();
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_QUESTION_MODEL || 'openai/gpt-5-mini';
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required.');
const configs = {
  chemistry: {
    subject: 'Chemistry', sections: ['Principles of Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'],
    topics: ['particles mixtures and separation', 'atomic structure periodicity and bonding', 'moles formulae and equations', 'acids bases salts and qualitative analysis', 'redox electrolysis rates equilibrium and energetics', 'organic nomenclature reactions and polymers', 'metals extraction corrosion and environmental chemistry'],
    visuals: ['table', 'graph', 'apparatus', 'particle_model', 'structural_formula', 'reaction_scheme'],
  },
  physics: {
    subject: 'Physics', sections: ['Mechanics', 'Thermal Physics and Kinetic Theory', 'Waves and Optics', 'Electricity and Magnetism', 'The Physics of the Atom'],
    topics: ['measurement motion forces moments energy and machines', 'pressure thermal behaviour and kinetic theory', 'waves sound reflection refraction and lenses', 'current circuits electrical energy electronics and electromagnetism', 'atomic structure radioactivity and nuclear energy'],
    visuals: ['table', 'graph', 'apparatus', 'circuit', 'ray_diagram', 'force_diagram', 'wave_diagram'],
  },
};
const config = configs[subjectKey];
if (!config) throw new Error('Subject must be chemistry or physics.');

const profileAllocations = {
  1: { knowledge_comprehension: 3, use_of_knowledge: 12, experimental_skills: 10 },
  2: { knowledge_comprehension: 7, use_of_knowledge: 8, experimental_skills: 0 },
  3: { knowledge_comprehension: 7, use_of_knowledge: 8, experimental_skills: 0 },
  4: { knowledge_comprehension: 6, use_of_knowledge: 9, experimental_skills: 0 },
  5: { knowledge_comprehension: 6, use_of_knowledge: 9, experimental_skills: 0 },
  6: { knowledge_comprehension: 6, use_of_knowledge: 9, experimental_skills: 0 },
};
const schema = {
  name: `${subjectKey}_paper_2_form_a`, strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['id', 'subject', 'paper', 'questions', 'validationNotes'],
    properties: {
      id: { type: 'string' }, subject: { type: 'string', const: config.subject }, paper: { type: 'integer', const: 2 },
      questions: {
        type: 'array', minItems: 6, maxItems: 6,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'number', 'kind', 'syllabusSections', 'topics', 'scenario', 'stimulus', 'subparts', 'totalMarks', 'status'],
          properties: {
            id: { type: 'string' }, number: { type: 'integer', minimum: 1, maximum: 6 },
            kind: { type: 'string', enum: ['data_analysis', 'structured', 'extended_response'] },
            syllabusSections: { type: 'array', minItems: 1, items: { type: 'string', enum: config.sections } },
            topics: { type: 'array', minItems: 1, items: { type: 'string' } }, scenario: { type: 'string' },
            stimulus: {
              anyOf: [
                { type: 'null' },
                { type: 'object', additionalProperties: false, required: ['type', 'title', 'description', 'labels', 'data'], properties: {
                  type: { type: 'string', enum: config.visuals }, title: { type: 'string' }, description: { type: 'string' },
                  labels: { type: 'array', items: { type: 'string' } }, data: { type: 'array', items: { type: 'string' } },
                } },
              ],
            },
            subparts: {
              type: 'array', minItems: 3, maxItems: 8,
              items: {
                type: 'object', additionalProperties: false,
                required: ['id', 'label', 'prompt', 'marks', 'profile', 'responseType', 'answer', 'markScheme', 'visualSpec'],
                properties: {
                  id: { type: 'string' }, label: { type: 'string' }, prompt: { type: 'string' }, marks: { type: 'integer', minimum: 1, maximum: 10 },
                  profile: { type: 'string', enum: ['knowledge_comprehension', 'use_of_knowledge', 'experimental_skills'] },
                  responseType: { type: 'string', enum: ['short_text', 'calculation', 'table', 'graph_plot', 'diagram_draw', 'extended_text'] },
                  answer: { type: 'string' }, markScheme: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['point', 'marks'], properties: { point: { type: 'string' }, marks: { type: 'integer', minimum: 1 } } } },
                  visualSpec: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['type', 'description', 'labels', 'data'], properties: { type: { type: 'string', enum: config.visuals }, description: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } }, data: { type: 'array', items: { type: 'string' } } } }] },
                },
              },
            },
            totalMarks: { type: 'integer', enum: [15, 25] }, status: { type: 'string', const: 'review_pending' },
          },
        },
      },
      validationNotes: { type: 'array', items: { type: 'string' } },
    },
  },
};

const system = `Create one complete ORIGINAL CSEC ${config.subject} Paper 2 practice paper. Return strict JSON only.
Use the syllabus as authority. Never copy, closely paraphrase, or merely change numbers in a recognisable past-paper item.
Official format: six compulsory questions in 2 hours 30 minutes. Q1 is a 25-mark data-analysis question. Q2 and Q3 are 15-mark structured questions. Q4-Q6 are 15-mark extended-response questions. Total 100 marks.
Use these exact profile allocations by question: ${JSON.stringify(profileAllocations)}. The subpart marks assigned to each profile must sum exactly to that question's allocation. Overall totals: KC 35, UK 55, XS 10.
Cover all sections across the paper: ${config.sections.join('; ')}. Draw from: ${config.topics.join('; ')}.
Q1 must provide a complete original dataset, units, headings, enough values for meaningful analysis, and assess data handling/graphing or interpretation plus experimental limitations/precautions. Do not require a learner to perform a physical experiment.
Each question should use one coherent scenario with progressive subparts. Use SI units. State every constant needed. Check every calculation independently. Mark-scheme points must sum exactly to each subpart's marks and award method, substitution, units and reasoning explicitly where relevant.
Use declarative visual specifications for any required graph, circuit, ray diagram, apparatus, structure or other figure. Never mention an unseen figure. Questions must be answerable in the web interface using text, calculation lines, table/plot interaction, or drawing tools.
Contexts should feel Caribbean-relevant without requiring specialised island knowledge. Status is review_pending.`;

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': `MyCSECPal ${config.subject} Paper 2 generation` },
  body: JSON.stringify({ model, reasoning: { effort: 'medium' }, temperature: 0.3, response_format: { type: 'json_schema', json_schema: schema }, messages: [{ role: 'system', content: system }, { role: 'user', content: 'Generate the full paper now. Audit every profile total, mark total, equation, unit and answer before returning.' }] }),
});
if (!response.ok) throw new Error(`OpenRouter failed (${response.status}): ${(await response.text()).slice(0, 1000)}`);
const payload = await response.json(); const raw = JSON.parse(payload.choices?.[0]?.message?.content || 'null');
if (!raw) throw new Error('OpenRouter returned no JSON.');
const paper = { ...raw, form: 'A', durationSeconds: 9000, totalMarks: 100, profileMarks: { knowledge_comprehension: 35, use_of_knowledge: 55, experimental_skills: 10 }, status: 'review_pending' };
const output = path.resolve(`data/${subjectKey}/paper-2-form-a-review-candidate.json`);
await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(paper, null, 2)}\n`);
console.log(JSON.stringify({ output, model, questions: paper.questions.length }));
