# Session: posthog session replay

Summary: Durable trace and handoff for one agent work session.
Use when: Continuing, reviewing, or auditing this task without relying on chat history.
Owner: agent and repository owner.
Started: 2026-07-17.
Last verified: 17 July 2026.
Status: implementation complete pending deployment configuration.
Planned tag: `agent/posthog-session-replay` after an authorized commit.

## Objective and acceptance

- Objective: Install PostHog product analytics and session replay for beta observation.
- Acceptance checks: supported SDK initialization, authenticated UUID identification, privacy masking, CSP support, production build, running-app verification, and no project token committed.
- Out of scope: PostHog dashboard/project-setting changes that require account access, deployment, commit, or push.

## Authority and risk

- External mutations authorized: install the official npm SDK; configure the supplied client project token locally.
- Production actions authorized: none.
- Risk level and reasons: high privacy sensitivity because recordings cover learner exam and profile flows.

## Context and decisions

- Relevant docs: `docs/security.md`, `docs/system-architecture.md`, official PostHog Next.js and privacy documentation.
- Assumptions: supplied `phc_` token belongs to PostHog US Cloud; host remains environment-configurable.
- Decisions: mask every form input, strip query strings, disable canvas capture, identify only by Supabase UUID, respect Do Not Track.

## Trace

| Time | Action / evidence | Result / next action |
|---|---|---|
| Research | Checked current PostHog Next.js and replay privacy documentation | Use `instrumentation-client.js`, identify after login, mask in browser |
| Install | Installed `posthog-js@1.404.0` | Production audit reports zero vulnerabilities |
| Privacy | Added input masking, sensitive selectors, URL query removal, no headers/bodies/canvas, DNT support | Contract test protects the configuration |
| Identity | Added Supabase auth listener | Identify by UUID only and reset on sign-out; no email/profile properties |
| Runtime | Built and started production app | Build passed; `/` and database health returned 200; CSP permits configured PostHog hosts |
| Performance | Compared build output | Global SDK adds approximately 73 kB to shared first-load JS; accepted for requested replay capability |

## Files and validation

- Files changed: instrumentation client, auth identity bridge, root layout, CSP, environment example, security/architecture docs, repository contracts, npm manifests.
- Targeted tests: `npm run validate:precommit`, `npm audit --omit=dev`, session replay repository contract.
- App paths exercised: `/`, `/api/health/database` in the production build.
- Full validation: production build passed with pre-existing Supabase Edge and CSS compatibility warnings.
- Independent reviews: implementation packet generated; no external different-model provider configured.

## Handoff

- Current state: locally configured and verified; supplied project token remains only in ignored `.env`.
- Known risks: production host must receive both PostHog variables; privacy notice/consent must disclose replay; PostHog project settings must keep network payload and console recording disabled; browser network inspection was unavailable in this workspace.
- Exact next action: add deploy-time variables, deploy, create a short test session, then confirm it appears under PostHog Session Replay.
- Commit/tag/deployment state: not requested and not performed.
