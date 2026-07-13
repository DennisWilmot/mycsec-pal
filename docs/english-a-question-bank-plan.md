# English A Question Bank Plan

Status: first implementation slice  
Authority: CSEC English syllabus revised 2025  
Supporting evidence: May/June 2024 English A subject report

## Version rule

The revised 2025 syllabus is the authority for future forms. The 2024 subject report describes the earlier examination and is used only for observable misconception patterns, task-shape evidence and reviewer guidance. It must not override the revised format.

## Revised English A Paper 1 blueprint

- Duration: 1 hour 30 minutes.
- Total: 60 compulsory multiple-choice items.
- Module allocation: 20 items per module.
- Per module: 5 discrete language items and 15 reading-comprehension items.
- Reading items use two original or appropriately licensed stimuli per module.
- Profile allocation per module: 7 Understanding, 7 Analysing, 6 Evaluating and Creating.

### Stimulus requirements

| Module | Discourse | Stimulus 1 | Stimulus 2 |
|---|---|---|---|
| 1 | Informative | Informative extract | Visual information such as a table, chart, form, map or advertisement |
| 2 | Literary | Original poem | Original literary extract |
| 3 | Persuasive | Persuasive extract | Visual persuasive text |

## Revised English A Paper 2 blueprint

- Duration: 2 hours 45 minutes.
- Total: 120 raw marks, 40 per module.
- Module 1: informative summary, 10 marks; informative exposition, 30 marks.
- Module 2: literary summary, 10 marks; choose one of two short-story prompts, 30 marks.
- Module 3: persuasive summary, 10 marks; persuasive response, 30 marks.
- Per-module profile allocation: Understanding 10, Analysing 10, Evaluating and Creating 20.

## Subject-report misconception evidence

Candidate questions and rubrics should cover observable patterns including:

- missing or combining required summary points;
- copying source wording rather than paraphrasing;
- exceeding the stated word/paragraph limit;
- weak cohesion, paragraphing, grammar, spelling and punctuation;
- selecting the wrong functional format;
- using an unsuitable audience, tone or register;
- repeating content or drifting into the wrong discourse mode;
- reporting events instead of constructing a narrative;
- weak plot, conflict, characterisation, atmosphere and narrative voice;
- taking a position that contradicts the supporting argument;
- unsupported claims, weak paragraph development and colloquial language in formal argument.

These are candidate-content design and feedback signals. They must not be used to make psychological claims about learners.

## Generation rules

- Use `OPENROUTER_QUESTION_MODEL` for candidate generation.
- Use `OPENROUTER_REVIEW_MODEL` only for escalated review after deterministic checks.
- Generate original stimuli; never reproduce subject-report exemplars or past-paper passages.
- Return strict JSON.
- Preserve module, item type, objective, profile, difficulty and answer rationale.
- Every multiple-choice item has four distinct options and exactly one answer.
- Passage-based answers must be supported directly by the supplied generated stimulus.
- Generated batches remain `review_pending`; they are not production questions.

## First batch

The first batch is Module 1 Paper 1:

- five discrete informative-discourse/language items;
- one original informative passage with eight questions;
- one original visual-information specification with seven questions;
- 20 total items with a 7/7/6 profile balance.

