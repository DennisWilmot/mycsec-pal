import process from "node:process";

const values = {};
for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/, "")] = process.argv[index + 1];
const url = values.url ?? "http://localhost:3000/api/health/database";
const requests = Number(values.requests ?? 100);
const concurrency = Number(values.concurrency ?? 10);
const p95Budget = Number(values["p95-ms"] ?? 750);
const maxBudget = Number(values["max-ms"] ?? 2000);
if (![requests, concurrency, p95Budget, maxBudget].every(Number.isFinite) || requests < 1 || concurrency < 1) throw new Error("Invalid benchmark arguments");

const durations = [];
let failures = 0;
let cursor = 0;
async function worker() {
  while (cursor < requests) {
    cursor += 1;
    const start = performance.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(maxBudget * 2) });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    }
    durations.push(performance.now() - start);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
durations.sort((a, b) => a - b);
const percentile = (p) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * p) - 1)];
const result = { url, requests, concurrency, failures, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), maxMs: Math.round(durations.at(-1)) };
console.log(JSON.stringify(result, null, 2));
if (failures > 0 || result.p95Ms > p95Budget || result.maxMs > maxBudget) process.exit(1);

