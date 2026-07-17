---
name: mycsecpal-workflow
description: Run MyCSECPal repository work from discovery through handoff with required app execution, targeted tests, living-doc updates, risk-based review, and release gates. Use for implementation, debugging, refactoring, content pipelines, database work, security/performance assessment, release preparation, autonomous work, or any substantial change in this repository.
---

# MyCSECPal workflow

## Start

1. Read `/AGENTS.md`, inspect `git status`, and locate the relevant living docs.
2. Create a worksheet with `npm run agent:session -- new <slug>` for substantial work. Record scope, assumptions, authorization boundaries, files, commands, findings, and next action as work progresses.
3. Define acceptance checks before editing. Prefer the smallest test that can fail for the reported defect.
4. Research current behavior from code and direct execution. Do not treat a plan document as proof of implementation.

## Plan and review

Classify risk as low, medium, or high. Treat authentication, authorization, payments, destructive database work, exam integrity, marking, production operations, and user-data boundaries as high risk.

For major stages—research, plan, implementation, and wrap-up—prepare an independent review packet using `npm run agent:review -- --stage <stage>`. Use a different model/provider when available. If unavailable, record the missing independent review; same-model self-review must not be labelled independent review. Follow `docs/agent-review.md`.

## Implement

- Preserve unrelated changes and avoid shared-file collisions.
- Make reversible, scoped changes. Do not mutate production or publish without explicit authority.
- Add or improve a targeted test with behavior changes. Avoid tests that merely mirror implementation.
- Update relevant living docs in the same change.
- Turn recurring mistakes into deterministic checks or autofixes when safe. Do not introduce an LLM auto-fixer into pre-commit; hooks must be deterministic and auditable.

## Exercise the app

Run the actual application for product changes. Exercise the changed route through the browser or `npm run test:smoke`. Inspect narrow and desktop layouts for UI work. If app execution is impossible, document the exact blocker and compensate with the strongest available test; do not silently skip it.

## Validate

Run targeted checks during implementation, then:

- `npm run validate:precommit` before committing.
- `npm run validate:full` at end of shift.
- Relevant release/content/load/security gates for affected systems.

Read `docs/testing.md` for command selection and `docs/end-of-shift.md` for release handoff. Never weaken a check solely to make a change pass.

## Finish

1. Review the diff for secrets, unsafe migrations, authorization gaps, stale docs, and accidental scope.
2. Update the worksheet so another agent can continue without chat history.
3. Append workflow friction or a useful improvement to `agent/feedback.md`.
4. Commit, tag, push, deploy, or mutate external systems only when authorized. When tagging an authorized commit, use `agent/<worksheet-slug>` and record the tag in the worksheet.
