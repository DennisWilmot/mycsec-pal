# Test catalog

Summary: Inventory of automated MyCSECPal checks, what they prove, and what they do not prove.
Use when: Selecting validation, adding tests, assessing release evidence, or auditing false confidence.
Owner: Quality engineering.
Last verified: 16 July 2026.
Update trigger: Any suite, script, route, threshold, or covered behavior changes.
Audit cadence: Review quarterly and before public release.

| Command | Proves | Does not prove |
|---|---|---|
| `npm test` | Repository contracts and agent-operability invariants | Browser behavior or database integration |
| `npm run lint` | Configured static code rules | Runtime correctness |
| `npm run typecheck` | TypeScript compilation | JavaScript route behavior or domain validity |
| `npm run build` | Production bundle compiles | Hosting configuration or live deployment |
| `npm run db:check` | Drizzle schema/migration consistency | Migration safety on production data |
| `npm run db:seed:validate` | Mathematics seed structure | Database publication or UI rendering |
| `npm run math:review:validate` | Mathematics review artifacts meet validators | Examiner correctness beyond encoded rules |
| `npm run english:release:validate` | English forms, keys, rubrics, and release rules meet validators | Human editorial approval or production publication |
| `npm run pool:release:verify` | Configured DB content-pool coverage and blueprints | Peak concurrency or pedagogy |
| `npm run test:smoke` | Running app serves key public/health routes | Full signed-in learner journey |
| `npm run test:authz` | Cross-user API access is denied for prepared users | All authorization surfaces |
| `npm run load:test` | Configured k6 scenario meets its thresholds | Unlimited scale or third-party quotas |
| `npm run perf:http` | Basic endpoint latency/error rate under local concurrency | Database-heavy authenticated exam traffic |

## False-confidence audit

For each critical suite, periodically introduce a safe temporary fault or inspect whether the assertion would fail for the original defect. Reject tests that only assert mocks were called, accept any status, or snapshot huge unstable trees. Record audit findings in a worksheet and improve the test in the same change.

