# MyCSECPal End-to-End Delivery Plan

Summary: Product delivery sequence and acceptance framing across learner journeys and release surfaces.
Use when: Planning cross-system delivery or checking whether a learner journey is complete end to end.
Owner: Product delivery.
Last verified: 16 July 2026.
Status: active execution plan

Last audited: 13 July 2026

Release target: a new learner can sign up, select Mathematics, complete either paper, receive a trustworthy report, revisit it from Progress, and manage their account in a production deployment.

This document is the release source of truth. A component is not complete because an API or table exists; it is complete only when its visible loading, empty, success, conflict, offline and failure states are driven by durable backend state and verified through the browser.

## Status vocabulary

- **Complete** — implemented and verified against its acceptance gate.
- **Partial** — useful infrastructure exists, but at least one visible or failure state is not connected.
- **Demo** — the screen renders invented/local data and is not a production feature.
- **Blocked** — implementation requires a credential, provider decision or reviewed content.

## Product wiring matrix

| Surface | Visible component/state | Current source | Required durable source/action | Current status | Acceptance gate |
|---|---|---|---|---|---|
| `/` | Header identity and Sign In/Start action | Static navigation | Verified Supabase session | Demo | Signed-in users see Continue; signed-out users see Sign In and Start Practising. |
| `/` | Subject availability | Static subject list | Published catalogue query | Demo | Cards reflect published paper versions and selected launch availability. |
| `/` | Paper 2 sample | Static copy | Reviewed sample or remove interaction | Demo | The button opens a working reviewed sample, or is not interactive. |
| `/onboarding` | Email registration | Supabase client | Supabase Auth plus profile transaction | Partial | Account survives refresh, verification and later sign-in. |
| `/onboarding` | Google authentication | Supabase OAuth | Callback plus provider-derived avatar | Partial | Google return completes the same onboarding transaction exactly once. |
| `/onboarding` | Sign-in/reset/verification | Incomplete UI | Supabase sign-in, resend and reset flows | Partial | Returning and locked-out users can recover without manual database work. |
| `/onboarding` | Role/details/subjects | Profile APIs | Atomic onboarding completion | Partial | One to five real subject IDs persist; invalid fields render beside inputs. |
| `/onboarding` | Parent/teacher promises | UI collects child data | Relationship records or remove claim from MVP | Demo | The UI never promises a child account/link that is not persisted. |
| Shared shell | Identity, avatar and sign out | `/api/me/profile` plus Supabase sign-out | Google avatar policy and initials fallback | Partial | Every protected route shows the same real identity and sign-out clears the session. |
| Shared shell | Sidebar collapse | Component memory | Local preference | Partial | Collapse survives route changes and refresh without logo overflow. |
| `/practice` | Subject cards | `/api/me/practice-dashboard` | Profile subjects plus published versions | Complete | Empty, loading, error and published/coming-soon states are accurate. |
| `/practice` | Resume banner | Active attempt query | Server-owned lifecycle/timer | Partial | Paused and in-progress states resume the exact attempt; expired state cannot strand the learner. |
| `/practice` | Start versus Resume buttons | Always says Start on cards | Per-paper attempt-aware action model | Partial | Matching active paper says Resume; another paper opens resume/cancel conflict; no attempt says Start. |
| Briefing | Paper facts and availability | Dashboard query | Canonical paper briefing response | Partial | Correct subject/version/instructions load from the selected URL, not hard-coded Mathematics. |
| Briefing | Existing attempt | Warning plus disabled Start | Resume matching attempt; conflict action for another | Partial | There is always a clear next action and no dead disabled state. |
| Paper 1 | Session, timer and answers | Attempt APIs with demo fallback | Attempt snapshot only on protected canonical route | Partial | Refresh restores all answers and never exposes answer keys. |
| Paper 1 | Offline answer safety | Debounced network save | IndexedDB mutation outbox plus revision reconciliation | Missing | Offline answers visibly queue and flush in order after reconnection. |
| Paper 1 | Flag/integrity/expiry | Partial | Flag API, disclosed visibility events, automatic expiry submission | Partial | Timer expiry produces one submission; flags restore; tab events are durable. |
| Paper 1 | Submit | Idempotent submit API | Submission check plus durable outbox | Complete | Double-click/retry creates one job and routes to the canonical report. |
| Paper 2 | Working lines and graph | Attempt response APIs | Validated structured response contract | Partial | Every part, final answer and plotted point restores after refresh. |
| Paper 2 | Offline answer safety | Debounced network save | Same IndexedDB outbox as Paper 1 | Missing | Weak connectivity cannot silently lose working. |
| Paper 2 | Marking | Worker returns `awaiting_paper_2_marker` | Reviewed rubric marker with bounded AI concurrency | Missing | Each part receives bounded marks, evidence and prompt/model version; retries are idempotent. |
| `/results/:attemptId` | Marking status | One-shot API plus Redis SSE | Durable state plus terminal stream handling | Partial | Reconnect resumes with `Last-Event-ID`; terminal states close; retained-stream loss reconciles once. |
| `/results/:attemptId` | Score and review | Result API | Exact frozen attempt, marks and safe answers | Complete for Paper 1 | Owner sees only their report; correct answers appear only after marking. |
| `/results/:attemptId` | Examiner summary | Honest null fallback | Structured summary job | Missing | Summary cites actual evidence, time use, misconceptions and next actions. |
| `/results` | Generic result route | Redirects to real Progress | Latest real report lookup remains optional | Complete | No invented score/report remains on a protected production route. |
| `/progress` | Month cards | Marked-attempt summary query | Production-like authenticated verification | Partial | Counts, average, time and last activity change after one marked attempt exactly once. |
| `/progress` | Tabs/radar/insights | Profile subjects and topic aggregates | Production-like authenticated verification | Partial | Only selected subjects render; claims require minimum evidence. |
| `/progress` | Attempts/topics table | Real marked attempts/topics, limited to ten | Cursor pagination | Partial | Rows link to their exact `/results/:attemptId`; filters change server data. |
| `/settings` | Profile and subjects | Real APIs | Existing profile/subject transactions | Partial | Refresh confirms saved values and five-subject enforcement. |
| `/settings` | Email/password | Read-only copy | Supabase update/verification/reset | Missing | Sensitive changes require the correct provider flow and visible confirmation. |
| `/settings` | Subscription | Static “Free MVP” card | Stripe checkout/portal plus webhook projection | Missing | A test payment changes entitlement exactly once and webhook replay is safe. |
| `/settings` | Export/delete | None | Authenticated privacy jobs | Missing | A user can request export and delete their account without orphaned private data. |
| Background | Paper 1 marking | Inngest deterministic worker | Production keys and registration | Partial | A deployed submission reaches marked after worker restart/retry without duplicates. |
| Background | Outbox/status delivery | Postgres → Inngest/Redis | Monitoring, retry and dead-letter operations | Partial | A failed relay is visible and recoverable; learners never poll the database. |

## Practice action contract

The Practice screen and briefing must derive actions from one server response.

| Current learner state | Matching paper card | Other paper card | Resume banner | Briefing primary action |
|---|---|---|---|---|
| No active attempt | `Start Paper` | `Start Paper` | Hidden | `Start Paper` |
| Matching `in_progress` | `Resume Paper` | `Start Paper` → conflict dialog | `Resume paper` | `Resume Paper` |
| Matching `paused` | `Resume Paper` | `Start Paper` → conflict dialog | `Resume paper` | `Resume Paper` |
| Another active/paused attempt | `Start Paper` → conflict dialog | Same | Shows existing paper | `Resume current` and `Return to Practice` |
| `submitted` or `marking` | `Start Paper` if no active attempt | `Start Paper` | Marking status card, not resume | `View marking status` when reopening that attempt |
| `marking_failed` | `Start Paper` if no active attempt | `Start Paper` | Recovery/status card | `View report status` |
| `marked`, `cancelled` | `Start Paper` | `Start Paper` | Hidden | `Start Paper` |
| Expired | Never shown as resumable | Never shown as resumable | Automatic submit/status transition | `View submission status` |

## Delivery phases

### Phase A — Truthful identity and navigation

- [ ] Configure and verify Supabase browser credentials.
- [ ] Replace all hard-coded identity with one shared profile/session component.
- [ ] Implement real sign-in, sign-out, email verification and password reset.
- [x] Persist sidebar collapse locally.
- [x] Redirect legacy `/paper-1`, `/paper-2` and `/results` routes to canonical real routes.
- [x] Remove demo fallbacks reachable from protected exam routes.

Gate: a returning user can authenticate, traverse every protected route and sign out without seeing invented identity or data.

### Phase B — Catalogue, Practice and briefing lifecycle

- [ ] Implement the Practice action contract above.
- [ ] Make briefing subject/version-driven and actionable during conflicts.
- [x] Automatically submit expired attempts through the same durable marking path.
- [ ] Add start/resume/cancel browser tests.

Gate: no attempt state produces a dead button, duplicate attempt or misleading action.

### Phase C — Resilient exam capture

- [x] Add a shared IndexedDB response outbox.
- [x] Show saving, saved and offline-queued states on Paper 2; Paper 1 uses the same queue but still needs the compact indicator.
- [x] Flush answer/flag mutations in revision order after reconnect and block submit until flushed.
- [x] Persist answers and flags for both papers; disclosed integrity-event persistence remains outstanding.
- [ ] Add refresh, offline and stale-revision integration tests.

Gate: killing connectivity or refreshing cannot lose an acknowledged answer.

### Phase D — Complete marking and reports

- [x] Review and version Paper 2 mark schemes for the current 9-question form.
- [x] Implement one-call-per-paper, schema-validated OpenRouter rubric marking with Inngest concurrency/retries.
- [x] Store per-part evidence, provider, model and prompt version.
- [x] Generate evidence-grounded examiner summaries for both papers.
- [ ] Add staff/system retry for `marking_failed`.
- [x] Close terminal SSE streams and add one-shot reconciliation.
- [ ] Publish Paper 2 only after the marking fixture suite passes.

Gate: Paper 1 and Paper 2 both reach a stable, reproducible report after worker failure and retry.

### Phase E — Real Progress

- [x] Add marked-attempt summary, profile, attempts and topic APIs.
- [x] Replace every hard-coded Progress value.
- [x] Enforce evidence thresholds for strongest/focus claims.
- [x] Link every attempt row to its immutable report.
- [ ] Add cursor pagination and empty states.

Gate: marking one controlled fixture changes only the expected progress values once.

### Phase F — Account, billing and privacy

- [ ] Complete provider-safe email/password management.
- [ ] Decide whether parent/teacher relationships launch; implement or remove promises.
- [x] Add Stripe Checkout, Portal and idempotent signed webhook projection; provider credentials remain required.
- [ ] Enforce entitlements server-side.
- [ ] Add account export and deletion.

Gate: a Stripe test payment changes access, webhook replay is harmless, and cancellation restores the correct entitlement at period end.

### Phase G — Security, reliability and deployment

- [ ] Test RLS with two learners and the worker role.
- [x] Add Redis-backed endpoint-specific mutation rate limits with a bounded in-process fallback and Inngest marking concurrency.
- [ ] Add structured request, attempt, outbox and Inngest correlation logs.
- [ ] Verify answer keys/mark schemes never enter active-session payloads.
- [ ] Add backups, migration rollback and retention procedures.
- [ ] Load-test HTTP, Postgres, Redis/SSE and AI queues at the launch target.
- [ ] Deploy and run both full browser journeys in production-like infrastructure.

Gate: sign-up → Paper 1 → result → Progress and Paper 2 graph → AI marking → report pass under failure injection.

## Credential and provider blockers

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the current Supabase publishable key is required for real browser authentication.
- Production Inngest event/signing keys are required outside local development.
- Stripe secret key, webhook secret and Practice price ID are required to activate paid access. Until supplied, billing endpoints return a safe unavailable response.
- OpenRouter marking is pinned locally to `openai/gpt-5-mini`; the reviewed rubrics are seeded. Paper 2 remains `review` until the golden marking fixture suite passes.

## Verification recorded on 13 July 2026

- Production build: passed.
- Production dependency audit (`npm audit --omit=dev`): 0 vulnerabilities after the PostCSS security override.
- TypeScript (`tsc --noEmit`): passed.
- Drizzle schema check and migration `0003_billing`: passed and applied.
- Mathematics seed validation: passed (Paper 1: 60/60; Paper 2: 9 questions, 90 marks).
- Reviewed Paper 2 rubrics: seeded successfully.
- Not yet launch-cleared: Stripe credentials/webhook registration, browser Supabase publishable key, Paper 2 golden AI fixtures, RLS cross-user tests, load/failure tests, and server-side paid entitlements.

## Definition of shipped

The application is shipped only when every phase gate above passes in a production-like environment, the plan checkboxes reflect verified behaviour rather than file presence, and no protected route renders invented learner data.
