# Autonomous and night-shift operation

Summary: Guardrails for unattended MyCSECPal work that must remain reviewable and reversible.
Use when: The user authorizes autonomous, asynchronous, or overnight implementation.
Owner: Engineering workflow steward.
Last verified: 16 July 2026.
Authority: User scope remains controlling; unattended work does not broaden it.
Stop rule: Stop before production mutation, deployment, destructive data work, or unapproved external communication.

Work in small checkpoints. Keep the worksheet current after each checkpoint, run targeted tests immediately, and leave the tree in a buildable state. Prefer one fully validated task over multiple partial changes.

At every checkpoint:

1. Re-read the objective and authority boundary.
2. Inspect `git diff` and running processes.
3. Validate the changed path in the running app.
4. Request or prepare independent review for high-risk changes.
5. Record failures, evidence, and the next executable action.

At end of shift, run `npm run validate:full`, update living docs and the worksheet, append agent feedback, and report anything not run. Never hide flaky checks or leave an ambiguous production action for the next agent.

