# MyCSECPal task queue

Summary: Repository-local queue for work not tracked in a connected issue system.
Use when: Selecting follow-up work, recording discovered debt, or handing tasks across sessions.
Owner: Product and engineering leads.
Last verified: 16 July 2026.
Format: Keep tasks small, prioritized, and linked to evidence or a worksheet.
Status values: queued, ready, blocked, in-progress, done.

| Priority | Status | Task | Evidence / acceptance |
|---|---|---|---|
| P0 | ready | Cut production runtime DB access over to a non-bypass-RLS role | `docs/database-role-cutover.md`; security check passes |
| P1 | queued | Add browser E2E and visual-regression harness for critical learner journeys | `docs/visual-regression.md`; CI artifacts at required viewports |
| P1 | queued | Add authenticated staging performance baselines to CI/nightly workflow | `docs/performance.md`; comparable trend history |
| P1 | queued | Audit critical tests for false confidence using safe mutation checks | `docs/test-catalog.md`; findings and fixes recorded |
| P2 | queued | Connect cross-model review command for the team’s chosen providers | `docs/agent-review.md`; one packet reviewed by another provider |
| P2 | queued | Add periodic recent-commit sweep automation | Review last 10 commits for cross-change risks and open tasks |

