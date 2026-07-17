# End-of-shift validation

Summary: Final validation and handoff checklist for completed or paused MyCSECPal work.
Use when: Ending a substantial session, preparing a commit, or handing work to another agent.
Owner: Engineering workflow steward.
Last verified: 16 July 2026.
Primary command: `npm run validate:full`.
Rule: Report every skipped or failed check; do not imply unrun validation passed.

1. Inspect status/diff and confirm only intended files changed.
2. Run `npm run validate:full` plus relevant auth, pool, load, security, or visual checks.
3. Run the app and exercise changed paths; record the URL/viewport/test identity without secrets.
4. Resolve independent review findings or document disposition.
5. Update living docs, test catalog, worksheet, and `agent/feedback.md`.
6. Record remaining risks, migrations, external actions, and rollback/forward-fix plan.
7. Commit/tag/push/deploy only with authorization.

