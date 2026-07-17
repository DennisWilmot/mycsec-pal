# Testing strategy

Summary: Defines MyCSECPal test layers, command selection, app-execution rules, and test quality standards.
Use when: Planning, writing, running, reviewing, or debugging tests and release checks.
Owner: Quality engineering.
Last verified: 16 July 2026.
Catalog: `docs/test-catalog.md` lists every maintained suite and its purpose.
Core rule: Run targeted tests during work and the full gate at end of shift.

## Test layers

1. Repository contracts: `npm test` checks critical static invariants with Node's test runner.
2. Lint and types: `npm run lint` and `npm run typecheck`.
3. Domain validation: seed, English release, Mathematics review, and question-pool scripts.
4. App smoke: start the app, then run `npm run test:smoke` against key routes.
5. Authorization: `npm run test:authz` against isolated test users and a non-production environment.
6. Load/performance: k6 and the HTTP benchmark described in `docs/performance.md`.
7. Visual/E2E: browser-driven critical journeys described in `docs/visual-regression.md`.

## Requirements

- Write the smallest test that would have caught the defect.
- Assert externally visible behavior, ownership boundaries, durable state, or rendered output.
- Use stable fixtures. Never depend on production users or mutate production data.
- Avoid sleeps, order dependence, broad snapshots, and assertions that only repeat fixture values.
- A mocked authorization test does not replace a real cross-user denial test.
- Record new/changed suites in `docs/test-catalog.md`.

## Commands

- Targeted: run the narrow validator/test file for the affected system.
- Commit gate: `npm run validate:precommit`.
- End-of-shift gate: `npm run validate:full`.
- Running app: terminal 1 `npm run dev`; terminal 2 `npm run test:smoke`.

If a required suite cannot run, record why, what evidence was substituted, and who must complete it. “It should work” is not evidence.

