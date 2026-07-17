# Question Pool Progress

Summary: Snapshot of subject question counts, forms, blueprints, and release-pool coverage.
Use when: Assessing whether content pools support paper assembly and release.
Owner: Assessment content operations.
Last verified: 16 July 2026.

This is the human-readable release ledger for the practice-paper bank. The machine-readable source is [`data/question-pool-progress.json`](../data/question-pool-progress.json), regenerated with `npm run pool:progress:update`.

## Current approved pool

| Subject | Paper | Approved forms | Pool size | Assembly unit | Initial launch target | Progress |
|---|---:|---:|---:|---|---:|---:|
| Mathematics | 1 | 2 | 120 questions | Individual spine-compatible question | 300 | 40% |
| Mathematics | 2 | 2 | 18 structured questions | Complete question with dependent parts | 27 | 67% |
| English A | 1 | 3 | 180 questions / 9 module blocks / 18 stimuli | Complete 20-question module and its stimuli | 300 questions | 60% |
| English A | 2 | 3 | 21 printed tasks | Complete summary or writing task | 35 tasks | 60% |

## Assembly rules

- Mathematics Paper 1 selects individual questions by module, topic, profile, difficulty and marks.
- Mathematics Paper 2 selects complete structured questions; parts are never separated.
- English Paper 1 locks each selected module to one source form so all comprehension questions stay attached to the correct passages and visual stimuli.
- English Paper 2 selects complete structured tasks. Questions 4 and 5 remain a single narrative-choice route.
- Selection prioritizes questions the learner has not seen recently, then lower global exposure, with deterministic tie-breaking for safe retries.

## Release history

| Date | Change | Approval |
|---|---|---|
| 2026-07-14 | Mathematics Forms A-B approved: 120 Paper 1 and 18 Paper 2 questions. | Product owner |
| 2026-07-14 | English A Forms A-C approved: 180 Paper 1 questions and 21 printed Paper 2 tasks. | Product owner |

## Updating the ledger

1. Add candidates as a new editorial form or bank batch.
2. Run the subject structural validators.
3. Record the approval decision and publish only approved versions/questions.
4. Run `npm run pool:progress:update`.
5. Update the launch-target table if product targets change; do not count unapproved candidates as pool capacity.
