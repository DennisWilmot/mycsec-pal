# MyCSECPal agent router

Use this file as the entry point for every engineering session. Keep it short; route into the smallest relevant document instead of loading the entire repository handbook.

## Always

1. Read [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) and use the repo skill at [agent/skills/mycsecpal-workflow/SKILL.md](./agent/skills/mycsecpal-workflow/SKILL.md).
2. Inspect `git status` before editing. Preserve unrelated work and report shared-file collisions.
3. Create or update a worksheet in `agent/sessions/` for substantial work.
4. Run targeted validation while implementing. Run the app and exercise the changed path unless the task is documentation-only or the environment is blocked; record any exception.
5. Update the system docs and test catalog when behavior, architecture, operations, or coverage changes.
6. Never mutate production data, deploy, commit, push, or create tags unless the user authorizes that action.

## Route by task

| Work | Read first |
|---|---|
| Product/application change | `docs/system-architecture.md`, `docs/coding-conventions.md`, `docs/testing.md` |
| Auth, privacy, authorization | `docs/system-architecture.md`, `docs/security.md` |
| Database/schema/seed | `docs/system-architecture.md`, `docs/database-role-cutover.md`, relevant question-bank doc |
| English content/release | `docs/english-a-question-bank-plan.md`, `docs/question-bank-strategy.md` |
| Performance/load | `docs/performance.md`, `docs/testing.md` |
| E2E or visual work | `docs/testing.md`, `docs/test-catalog.md`, `docs/visual-regression.md` |
| Release/deployment | `docs/release-hardening-plan.md`, `docs/end-of-shift.md` |
| Agent review | `docs/agent-review.md` |
| Autonomous/night work | `agent/skills/mycsecpal-workflow/references/night-shift.md` |
| New task selection | `TODOS.md` |

## Discovering living docs

Every maintained system doc starts with `Summary`, `Use when`, `Owner`, and `Last verified` in its first seven lines. Search with `rg -n "^Use when:|^Owner:" docs agent`. Generated review forms under `docs/generated/` are artifacts, not system documentation.

## Commands

- Fast gate: `npm run validate:precommit`
- Full local gate: `npm run validate:full`
- App smoke test: start the app, then `npm run test:smoke`
- Review packet: `npm run agent:review -- --stage implementation`
- New worksheet: `npm run agent:session -- new short-task-name`

