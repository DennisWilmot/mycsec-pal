# MyCSECPal release-hardening plan

Summary: Risk-ranked beta release hardening tasks, evidence, and operational follow-ups.
Use when: Assessing launch readiness, selecting critical fixes, or handing off release risks.
Owner: Release engineering.
Last verified: 16 July 2026.
Updated: 15 July 2026

## Release position

The Mathematics and English A question pools pass their structural release checks. The application is suitable for a controlled beta after the P0 items below are verified, but it is not yet ready for 1,000 simultaneous active learners.

For the first live test, keep concurrent activity to 25–50 learners, stagger paper submissions, and monitor answer-save latency, database connections, outbox depth, marking duration, provider errors, and failed marking jobs.

## Tonight: release blockers (P0)

- [x] Remove unsupported parent-child linking and child-account creation promises from onboarding.
- [x] Freeze answer keys, options, question parts, and human-reviewed rubrics inside each new attempt. Mark and review from this immutable snapshot.
- [x] Reclaim outbox rows stranded in `publishing` after a worker interruption.
- [x] Add bounded OpenRouter request timeouts so one provider call cannot occupy a marking slot indefinitely.
- [x] Publish deterministic Paper 1 scores even when optional AI teaching feedback is unavailable.
- [x] Recalculate paper timers from server-provided remaining time and process heartbeat expiry responses.
- [x] Flush pending Paper 2 saves when the page is hidden or the learner navigates between questions.
- [x] Run the production build and all content/database validators.

## Before expanding the beta (P1)

- [x] Add an authenticated, rate-limited learner retry action for failed marking jobs.
- Add an operator view of queue depth and failure reasons.
- Replace the one-request Paper 2 marker with bounded question batches and partial checkpoints.
- Add adversarial AI-grading fixtures, including learner prompt-injection attempts and equivalent valid answers.
- [x] Add a disposable-environment cross-user authorization harness for attempts, responses, results, marking retry, cancellation, and admin access.
- [x] Add a non-owner, non-superuser, non-BYPASSRLS runtime-role provisioning and verification path.
- Perform the staged runtime-role credential cutover described in `docs/database-role-cutover.md`.
- Add rate limits to billing, onboarding, profile mutation, heartbeat, and other write-heavy endpoints.
- [x] Add Content-Security-Policy and HSTS with the Supabase browser origins allowed.
- Add cleanup policies for idempotency keys, outbox/event history, billing event payloads, and Redis attempt streams.
- Clear queued offline answers on sign-out and document how long locally stored answers are retained.
- Validate legal consent versions against server-owned constants.
- Moderate learner-submitted institution names instead of writing them directly into the shared institution catalogue.

## Scale work before 1,000 concurrent learners (P1)

- [x] Add a k6 staged harness for 100, 250, 500, and 1,000 active learners using session, heartbeat, and answer-save traffic.
- [x] Run the staged harness against an isolated environment with 1,000 disposable learner sessions and record the results.
- Establish explicit p95 targets for session load, answer save, paper start, submission acknowledgement, and marking completion.
- Add an index beginning with `attempt_questions.question_id` and measure the historical-exposure assembly query as attempt history grows.
- [x] Replace one-dedicated-Redis-connection-per-result-viewer SSE with adaptive result polling.
- Increase outbox dispatch capacity independently of AI marking concurrency and alert on oldest pending-event age.
- Set a deployment-wide database connection budget; the configured database currently reports 60 maximum connections.
- Confirm OpenRouter request, token, and cost limits for the maximum expected submission burst.

## Product correctness and support (P2)

- Implement parent-child linking as a separate feature with invitation, verified acceptance, relationship permissions, unlinking, audit history, and cross-account tests.
- Either implement teacher workflows or describe teacher accounts as beta exploration accounts.
- Make subject filters apply consistently to every progress summary and last-activity value.
- Provide a user-visible recovery path when offline changes cannot be synchronized.
- Treat paste prevention and tab-switch recording as learner guidance, not secure proctoring.

## Required automated gates

- Authentication: email and Google account switching, existing-account sign-in, onboarding redirect, and sign-out.
- Authorization: Alice cannot read or mutate Bob's attempts, responses, results, progress, billing, or event stream.
- Attempt lifecycle: start, save, pause, resume, expire, submit, duplicate submit, offline recovery, and retry.
- Marking: frozen answer-key reproducibility, deterministic Paper 1 fallback, Paper 2 rubric validation, provider timeout, malformed provider output, and retry exhaustion.
- Billing: checkout idempotency, webhook signature handling, subscription reconciliation, and endpoint rate limits.
- Responsive smoke coverage for landing, onboarding, practice, both papers, results, progress, and settings.
- Non-interactive linting, type checking, production build, schema check, seed validation, subject release validation, and pool verification.

## Current known gate failures

- The authenticated 1,000-learner load test failed every service-level threshold; see the evidence below.
- There is still no automated unit, integration, or browser test suite in the repository.
- [x] Add a current 0009 metadata baseline; `db:generate` now reports no schema changes instead of recreating migrations 0003–0008.

## Authenticated load-test evidence

Run on 15 July 2026 against a disposable Supabase branch with 1,000 isolated learner accounts and attempts. The application was a single optimized local Next.js process with a 10-connection application pool. Each active learner loaded their session, sent a heartbeat, and saved an answer every 30 seconds. Redis rate limiting was deliberately replaced with the in-memory test backend, so these results do not measure Redis capacity or production autoscaling/CDN behavior.

The 25-minute k6 schedule ramped through 100, 250, 500, and 1,000 concurrent learners. It failed all configured thresholds:

- 14,994 HTTP requests and 4,558 completed iterations.
- 39.81% request failure rate; target was below 1%.
- 60.18% successful checks; target was above 99%.
- Median response time 48.57 seconds; p95 and p99 were both 74 seconds.
- Session load: 2,662 succeeded and 2,600 failed (50% success).
- Heartbeat: 3,886 succeeded and 1,136 failed (77% success).
- Answer save: 2,476 succeeded and 2,234 failed (52% success).

The database itself did not saturate during sampled failure windows: it generally held 23–26 connections with 9–11 active. Server errors included Supabase Auth connection/DNS timeouts, local socket exhaustion (`EADDRNOTAVAIL`), closed pooled database connections, and statement timeouts while waiting for attempt-row locks. This makes repeated remote Auth validation and single-process outbound/request capacity the first investigation targets; simply increasing Postgres capacity is not supported by the evidence.

The service drained after ramp-down. The final database sample had 6 connections, 1 active, no idle transactions, no waiting attempt locks, 1,001 saved response rows, and 5,008 response revisions. The run did not show permanent database corruption, but the learner-visible availability and save reliability are unacceptable at the tested load.

Release implication: do not advertise or plan for 1,000 simultaneous active exam sessions yet. Keep the first controlled beta to 25–50 concurrent learners until Auth calls are deduplicated/cached safely, write transactions and row-lock scopes are reduced, production-like horizontal scaling is tested, and the same staged test passes the explicit thresholds.

### Remediation verification — 16 July 2026

Implemented the first capacity remediations:

- API requests no longer pass through page-auth middleware before authenticating in their route handler.
- High-volume attempt and result endpoints use verified JWT claims; asymmetric Supabase sessions can use cached JWKS verification.
- Browser heartbeats are non-overlapping and randomized across a 45–75 second interval.
- The normal heartbeat path is one conditional update instead of a `select ... for update` transaction.
- Supabase Auth, statement, row-lock, and idle-transaction waits now have bounded timeouts.

The same session, heartbeat, and answer-save workload then passed controlled-beta tests against the isolated branch:

- 50 concurrent learners: 786/786 checks, 0% failures, p95 879.79 ms, p99 980.18 ms.
- 100 concurrent learners: 1,569/1,569 checks, 0% failures, p95 889.64 ms, p99 990.99 ms.
- Cross-user authorization checks passed after the authentication change.
- Post-test database state: 14 connections, 1 active, no idle transactions, and no waiting attempt locks.

These results clear a controlled 25–50-person beta and provide tested headroom to 100 concurrent learners on the conservative single-process staging setup. They do not supersede the failed 1,000-user result. Before widening beyond the controlled beta, rerun the full staged test with normal asymmetric user sessions on production-like horizontally scaled hosting.
