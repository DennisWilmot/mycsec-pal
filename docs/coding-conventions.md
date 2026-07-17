# Coding conventions

Summary: Project-specific rules for maintainable Next.js, Supabase, Drizzle, and exam-domain code.
Use when: Implementing or reviewing application, API, schema, pipeline, or test changes.
Owner: Application maintainers.
Last verified: 16 July 2026.
Enforcement: Prefer ESLint, TypeScript, repository tests, and deterministic scripts over prose.
Update trigger: A repeated review issue or a new established code pattern.

## Boundaries

- Authenticate and authorize on the server for every learner-owned resource. A client-supplied user ID is never authority.
- Keep service-role/database credentials server-only. Never use `NEXT_PUBLIC_` for secrets.
- Use one canonical attempt lifecycle for Paper 1 and Paper 2; specialize response payloads, not state semantics.
- Preserve immutable published paper versions and historical attempt snapshots.
- Validate external input at API boundaries and return stable, non-sensitive errors.
- Make submission, webhook, and background-job operations idempotent.

## Next.js and React

- Prefer server components and route handlers unless browser state or interaction requires a client component.
- Keep components focused; move reusable domain logic into `lib/` rather than duplicating it in screens.
- Do not use `dangerouslySetInnerHTML` for question-bank content without a documented sanitizer and security test.
- Provide loading, empty, error, and narrow-screen states for user-facing data views.

## Data and migrations

- Add constraints and indexes deliberately; document backfills and rollback/forward-fix strategy.
- Never execute a production migration as an incidental validation step.
- Keep seeds deterministic and validate forms before publication.
- Avoid N+1 database access in question assembly, progress, reports, and attempt hydration.

## Tests and docs

- Test observable behavior and security boundaries, not private implementation details.
- Every defect fix should gain a regression test or a documented reason that automation is infeasible.
- Update `docs/test-catalog.md` and the relevant living system doc with behavior changes.

