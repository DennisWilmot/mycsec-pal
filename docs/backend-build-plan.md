# MyCSECPal Backend Build Plan

Summary: Historical and active checklist for building the backend from the architecture baseline.
Use when: Assessing backend status or planning remaining API, data, auth, and operational work.
Owner: Backend maintainers.
Last verified: 16 July 2026.
Status: execution plan  
Created: 12 July 2026  
Initial scope: CSEC Mathematics, Paper 1 and Paper 2

This plan turns [System Architecture](./system-architecture.md) and [Question Bank Strategy](./question-bank-strategy.md) into buildable, testable slices. Each phase should be completed and verified before the next phase becomes the main focus.

## 0. Confirm the MVP rules

- [ ] Confirm Paper 1 duration, Paper 2 duration and timer-expiry behaviour.
- [ ] Confirm that timer expiry automatically submits the current attempt.
- [ ] Confirm one active or paused attempt per learner.
- [ ] Confirm up to five active subjects on Guest and Practice plans.
- [ ] Confirm Google avatar only; email users receive initials.
- [ ] Confirm Paper 1 is marked deterministically and Paper 2 is marked asynchronously.
- [ ] Confirm the minimum viable Paper 2 response types:
  - ordered working lines;
  - final answer;
  - plotted graph coordinates and curve mode;
  - flags;
  - no handwritten-image uploads in the first release.

Completion gate: the decisions above are recorded as constants/policies rather than being duplicated inside UI components.

## 1. Database and server foundation

- [x] Add `DATABASE_URL` for the Supabase transaction-mode pooler to the ignored `.env`.
- [x] Install `drizzle-orm`, `drizzle-kit` and `postgres`.
- [x] Add an `.env.example` containing variable names and safe placeholders only.
- [x] Add `drizzle.config.ts`.
- [x] Add `drizzle/schema/` split by domain:
  - `identity.ts`;
  - `catalog.ts`;
  - `attempts.ts`;
  - `marking.ts`;
  - `billing.ts` later.
- [x] Add `lib/db/index.ts` with `postgres(DATABASE_URL, { prepare: false })`.
- [x] Add shared timestamp, UUID and enum helpers.
- [x] Generate the first SQL migration with Drizzle Kit.
- [x] Review generated SQL before applying it.
- [x] Add custom SQL for partial indexes and Supabase RLS policies.
- [x] Add a health check that verifies the server can query Postgres without exposing credentials.

First migration tables:

- `profiles`;
- `subjects`;
- `profile_subjects`;
- `topics`;
- `papers`;
- `paper_versions`;
- `questions`;
- `question_parts`;
- `question_options`;
- `question_topics`;
- `mark_schemes`;
- `attempts`;
- `attempt_questions`;
- `attempt_responses`;
- `attempt_events`;
- `results`;
- `question_marks`;
- `attempt_topic_results`;
- `examiner_summaries`;
- `marking_jobs`;
- `idempotency_keys`.
- `outbox_events` for durable queue and status-event publication.

Completion gate: a fresh Supabase database can be created from migrations, seeded, queried through Drizzle and protected by RLS.

## 2. Supabase authentication and onboarding

- [x] Install the Supabase browser and server packages.
- [x] Add browser, server and middleware Supabase clients.
- [x] Protect `/practice`, `/progress`, `/settings`, `/results/*` and exam routes.
- [x] Connect email/password sign-up.
- [x] Connect Google OAuth.
- [x] Create the profile row after first authentication.
- [x] Persist role, country, school/form and onboarding completion.
- [x] Persist one to five selected subjects.
- [x] Return field-level validation errors in the onboarding UI.
- [ ] Implement sign-in, sign-out, email verification and password reset.
- [ ] Read Google `avatar_url` only for Google identities; otherwise generate initials.

Completion gate: a new learner can sign up, finish onboarding, sign out, return, sign in and see the same profile and subjects.

## 3. Mathematics catalogue and question bank

- [x] Seed Mathematics as the first subject.
- [ ] Import the versioned syllabus hierarchy and objective codes.
- [x] Seed the 2027 Paper 1 and Paper 2 blueprints.
- [x] Convert the current Paper 1 demonstrator into database questions.
- [x] Convert the current Paper 2 demonstrator into questions, parts and mark schemes.
- [ ] Store diagram specifications as validated JSON, not arbitrary SVG/HTML.
- [ ] Store graph-response configuration including domains, ticks and snapping.
- [x] Add content status: `draft`, `review`, `approved`, `published`, `retired`.
- [x] Add provenance and generation metadata for generated questions.
- [ ] Add content validation scripts for:
  - mark totals;
  - correct-answer presence;
  - topic/objective mapping;
  - Paper 1 profile balance;
  - Paper 2 module allocation;
  - diagram accessibility text;
  - duplicate or near-duplicate content.

Completion gate: the database can assemble one valid 60-question Paper 1 and one valid nine-question/90-mark Paper 2 without reading hard-coded UI data files.

## 4. Attempt engine

- [x] Build one server-side attempt state service shared by both papers.
- [x] Implement `POST /api/attempts` with an idempotency key.
- [x] Snapshot the selected questions into `attempt_questions`.
- [x] Enforce one active/paused attempt using a partial unique index and transaction.
- [x] Implement `GET /api/attempts/:id/session`.
- [x] Implement autosave using `PUT /api/attempts/:id/responses/:attemptQuestionId`.
- [x] Debounce autosaves and send only changed responses; never write on every keystroke.
- [ ] Keep unsent response mutations in an IndexedDB outbox and flush them in order after reconnection.
- [x] Include `clientRevision` and return `serverRevision` to prevent stale overwrites.
- [x] Implement flag, pause, resume, cancel and heartbeat operations.
- [x] Calculate remaining time on the server.
- [x] Record append-only lifecycle and integrity events.
- [x] Implement submission preview with answered/unanswered counts.
- [x] Implement idempotent submission that locks responses.

Completion gate: refresh, reconnect and duplicate clicks cannot lose answers, create two attempts or submit twice.

## 5. Connect the learner experience

### Practice and briefing

- [x] Replace hard-coded profile subjects with `GET /api/me/practice-dashboard`.
- [x] Show a real active/paused attempt and remaining time.
- [x] Connect Resume, Cancel and Start Paper.
- [x] Load briefing duration, question count and instructions from the selected paper version.

### Paper 1

- [x] Load the attempt session from the backend.
- [x] Autosave every selected option.
- [x] Restore answers and flags after refresh.
- [x] Use the server timer and heartbeat corrections.
- [x] Submit and route to the attempt-specific result status.

### Paper 2

- [x] Save ordered working lines and final answers as structured JSON.
- [x] Save plotted points as numeric `{ x, y }` records in response JSON.
- [x] Restore lines, graph points and flags after refresh.
- [x] Validate graph points against the question domain and snapping rules server-side.
- [x] Submit through the same attempt lifecycle as Paper 1.

Completion gate: a learner can start, pause, resume, refresh and submit either paper without any hard-coded attempt state.

## 6. Marking pipeline with Inngest

- [x] Install the application `inngest` SDK.
- [x] Add the Next.js Inngest serve route.
- [x] Create an `attempt/submitted` outbox event containing only correlation metadata.
- [ ] Start the local worker with `npx inngest-cli@latest dev` only after the serve route and first function exist.
- [x] Build `mark-submitted-attempt` as an idempotent function.
- [x] Re-read the attempt and locked responses from Postgres inside the worker.
- [x] Mark Paper 1 deterministically from stored correct options.
- [ ] Mark Paper 2 parts against versioned mark schemes.
- [ ] Use bounded concurrency for Paper 2 question/part marking.
- [ ] Store every awarded mark with structured evidence and prompt/model versions.
- [x] Finalise Paper 1 totals only after all question marks succeed.
- [ ] Generate the structured examiner summary (topic results are implemented for Paper 1).
- [x] Move Paper 1 status through `submitted → marking → marked`.
- [x] On exhausted retries, move to `marking_failed` without losing responses.
- [ ] Add a safe staff/system retry event.

Recommended Inngest steps:

1. `claim-job` — transactionally create/claim the unique marking job.
2. `load-snapshot` — load immutable questions, responses and mark schemes.
3. `mark-objective-items` — deterministically mark Paper 1.
4. `mark-structured-parts` — fan out Paper 2 parts with a concurrency limit.
5. `validate-marks` — ensure marks are numeric, within bounds and complete.
6. `build-result` — write result, question marks and topic evidence transactionally.
7. `build-summary` — generate structured learner feedback.
8. `publish-result` — set `marked`, timestamp publication and emit `attempt/marked`.

Completion gate: killing and restarting the worker mid-mark cannot duplicate marks, lose a job or publish a partial result.

## 7. Results and progress

- [x] Add `/results/:attemptId` as the canonical report route.
- [x] Add a lightweight one-shot result-status endpoint for initial load and exceptional recovery only.
- [x] Add an authenticated event-backed SSE endpoint: `/api/attempts/:attemptId/events`.
- [x] Write each marking transition and an `outbox_event` in the same Postgres transaction.
- [x] Relay status outbox events to a managed Redis Stream; do not make the SSE handler query Postgres in a loop.
- [x] Authorise attempt ownership once when opening the SSE connection.
- [x] Support SSE `id`, `Last-Event-ID` and Redis Stream replay so brief Wi-Fi loss does not lose transitions.
- [x] Send a small SSE comment heartbeat to keep intermediaries from closing an otherwise idle connection; this is not a database poll.
- [ ] Close the stream after `marked` or `marking_failed` and when the page is closed.
- [ ] Perform one reconciliation fetch only if replay is unavailable or the retained stream has expired.
- [x] Connect score, completion, time and examiner-summary cards.
- [x] Connect question review to the exact attempt snapshot.
- [ ] Keep Paper 2 feedback focused on awarded/missed rubric points; worked solutions remain later scope.
- [ ] Build progress summary queries from marked attempts only.
- [ ] Build overall subject and per-topic radar data.
- [ ] Build recent attempts with cursor pagination and attempt-specific links.
- [ ] Apply the minimum evidence threshold before showing strongest/recommended topics.

Completion gate: submitting a paper eventually produces a stable report and changes the learner’s progress metrics exactly once.

### Status delivery topology

```text
Inngest worker
  → Postgres transaction: result/status + outbox event
  → outbox relay
  → managed Redis Stream (short retained history)
  → authenticated SSE endpoint
  → learner browser EventSource
```

The queue is for work; SSE is for learner-visible status. Browsers never poll Inngest, Redis or Postgres. Postgres remains authoritative, while the stream is a low-latency delivery and short replay layer.

## 8. Reliability, security and launch readiness

- [ ] Verify RLS with two test learners and a service-role marking worker.
- [ ] Ensure correct answers and mark schemes never enter active exam payloads.
- [ ] Add request validation and consistent structured errors.
- [ ] Add rate limits to auth, attempt creation, autosave, submission and marking retry.
- [ ] Add request IDs, attempt IDs and Inngest event IDs to structured logs.
- [ ] Apply separate concurrency budgets for HTTP, Postgres, SSE connections and AI work.
- [ ] Ensure the SSE deployment target supports long-lived streaming connections; run it as a dedicated small service if the main hosting runtime imposes short request limits.
- [ ] Cap Redis Stream length/retention and close terminal attempt streams.
- [ ] Cache public catalogue and paper-version metadata; do not repeatedly rebuild it from joins.
- [ ] Update progress projections when `attempt/marked` is emitted; do not recompute a learner's full history on every dashboard request.
- [ ] Add database backup and migration rollback procedures.
- [ ] Add retention/deletion policies for responses and integrity events.
- [ ] Add unit tests for state transitions, timer calculations and marking totals.
- [ ] Add integration tests for autosave conflict, duplicate submit and worker retry.
- [ ] Add one end-to-end test covering sign-up → Paper 1 → result → progress.
- [ ] Add one end-to-end test covering Paper 2 graph response → marking → report.

Completion gate: the critical learner journey passes in a production-like environment and failure injection does not corrupt attempt or marking state.

## Durability rules for every implementation phase

- The MVP may support fewer features, but completed features must use production-safe state transitions.
- No browser polling loops for marking, notifications or queue status.
- No browser access to queues, Redis credentials, service-role credentials, correct answers or mark schemes.
- No synchronous AI work inside learner HTTP requests.
- No dual writes without a transactional outbox when losing the event would strand durable state.
- No per-keystroke database writes; autosave is debounced, revisioned and offline-capable.
- No unbounded fan-out, database connections, AI concurrency, result lists or event streams.
- No progress calculation from unmarked or partially published results.
- Every background operation is idempotent and safe to retry.
- Every transient delivery channel has a durable source of truth and recovery path.

## Recommended delivery order

1. Database/configuration and migrations.
2. Authentication, profile and subject selection.
3. Catalogue plus the existing demonstrator questions.
4. Attempt lifecycle and autosave.
5. Paper 1 end to end with deterministic marking.
6. Results and progress for Paper 1.
7. Paper 2 structured responses and graph persistence.
8. Inngest Paper 2 marking and examiner summary.
9. Reliability/security hardening.
10. Question-generation pipeline expansion.

Paper 1 should be the first complete vertical slice. It validates authentication, catalogue, attempts, autosave, submission, results and progress without making AI marking a prerequisite. Paper 2 then reuses that proven lifecycle and adds structured responses plus asynchronous marking.

## Immediate next build slice

- [x] Create `drizzle.config.ts` and `lib/db/index.ts`.
- [x] Implement the first Drizzle schema files.
- [x] Generate and review migration `0000_backend_foundation`.
- [x] Add Supabase RLS SQL for learner-owned tables.
- [x] Seed Mathematics, its topics and both paper definitions.
- [x] Add a database health check and migration verification command.

Do not begin UI rewiring until this slice can be recreated successfully against an empty database.
