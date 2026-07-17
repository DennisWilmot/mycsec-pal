# Performance and load testing

Summary: Performance budgets, load-test safety rules, profiling workflow, and regression evidence.
Use when: Changing API/data access, attempts, marking, auth, assets, dashboards, caching, or deployment capacity.
Owner: Reliability reviewer.
Last verified: 16 July 2026.
Safety: Load tests target local or isolated staging only unless production testing is explicitly authorized.
Baseline: Store scenario, revision, environment, p50/p95/p99, error rate, and saturation evidence in the worksheet.

## Fast benchmark

Run the app and use `npm run perf:http -- --url http://localhost:3000/api/health/database --requests 100 --concurrency 10`. Default budgets are error rate `0`, p95 under `750 ms`, and maximum response under `2000 ms`; flags can override them.

## Representative load

Use `npm run load:test` with isolated users and the staging database. Model sign-in, paper load, autosave, navigation, pause/resume, and submission separately. Increase load gradually and observe application CPU/memory, open sockets, auth rate limits, Redis, connection pools, Postgres active connections/locks, and background queues.

## Profiling

Reproduce a narrow workload before optimizing. Capture a baseline, change one variable, rerun the identical scenario, and compare correctness plus latency/resource use. Prefer fixing request fan-out, unbounded concurrency, missing indexes, repeated session validation, and oversized payloads before adding caches.

Performance regressions are release blockers when a comparable run exceeds the agreed budget or raises errors. Do not compare results across materially different machines/environments without labelling the limitation.

