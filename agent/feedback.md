# Agent workflow feedback

Summary: Append-only observations used to improve MyCSECPal agent workflows and tooling.
Use when: Ending a substantial session or encountering repeated friction, ambiguity, or missing automation.
Owner: Engineering workflow steward.
Last verified: 16 July 2026.
Cadence: Review periodically and convert recurring issues into docs, scripts, tests, or lint rules.
Privacy: Do not include secrets, personal data, or raw production records.

## Entries

### 16 July 2026 — initial setup

- Existing domain validators made a strong base for a full gate.
- Hidden agent configuration directories can be environment-owned/read-only; a routed `agent/` directory is more portable across tools.
- Cross-model review needs an explicit provider command rather than pretending one model can independently review itself.

