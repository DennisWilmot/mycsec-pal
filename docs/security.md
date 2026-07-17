# Security model and review checklist

Summary: Security boundaries for identity, learner data, exams, database access, billing, and operations.
Use when: Touching auth, API routes, RLS, cookies, attempts, reports, uploads, billing, or production configuration.
Owner: Security reviewer.
Last verified: 16 July 2026.
Known priority: Replace the production bypass-RLS runtime role using `docs/database-role-cutover.md`.
Incident rule: Preserve evidence and avoid destructive remediation until impact is understood.

## Mandatory checks

- Derive identity from the validated server session and bind every learner-owned query to it.
- Rotate the auth session after OAuth/account changes; never reuse stale account state.
- Use secure, HTTP-only, same-site cookies appropriate to the redirect flow.
- Keep database, Supabase service-role, Stripe, Redis, and AI credentials server-only and out of logs.
- Enforce RLS/least privilege in addition to application checks.
- Rate-limit expensive/auth-sensitive endpoints and bound payload size.
- Keep correct answers and rubrics out of active exam payloads.
- Make webhooks signature-verified and idempotent.
- Prevent open redirects and validate callback destinations.
- Treat paste prevention and tab monitoring as exam-integrity signals, not strong security controls.

High-risk changes require an independent security persona review and a real negative-path test.

## Session replay

PostHog session replay is initialized only when `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is configured. All input and textarea values are masked in the browser, query strings are stripped from captured URLs/network names, canvas recording is disabled, and `.ph-no-capture` or `[data-private="true"]` can protect sensitive rendered regions. Only the Supabase user UUID is used for identification; email, name, school, answers, and profile properties are not sent through `identify`.

Keep the privacy notice and user consent language current before inviting testers. Reviewers must not weaken input masking to make recordings easier to read. Network request/response payload recording and console-log recording must remain disabled in the PostHog project settings unless a separate privacy review approves them.
