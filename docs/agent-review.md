# Independent agent review

Summary: Provider-neutral process for cross-model research, plan, implementation, and wrap-up reviews.
Use when: Work reaches a major stage or changes security, performance, data, marking, billing, or production behavior.
Owner: Engineering workflow steward.
Last verified: 16 July 2026.
Tool: `npm run agent:review -- --stage <research|plan|implementation|wrap-up>`.
Integrity: Same-model self-review must not be labelled independent review.

## Review packet

The tool creates a packet in `agent/reviews/` containing objective, stage, diff/status evidence, relevant docs, and persona prompts. Send the packet to a different model/provider using a configured `AGENT_REVIEW_COMMAND` or manually.

## Personas

- Maintainer: coupling, clarity, migration cost, duplicated logic, stale docs.
- Security: identity boundaries, secrets, injection, authorization, abuse, privacy.
- Performance/reliability: concurrency, retries, pooling, N+1 access, failure recovery.
- Product/domain: CSEC rules, marking validity, learner comprehension, exam integrity.
- Test skeptic: false positives, missing negative paths, unrealistic mocks, flaky behavior.
- AI-smell reviewer: invented abstractions, excessive prose, generic fallbacks, unjustified complexity.

Reviewers must cite files/lines, rank severity, separate facts from inference, and identify missing evidence. The implementing agent resolves or records every material finding in the worksheet.

