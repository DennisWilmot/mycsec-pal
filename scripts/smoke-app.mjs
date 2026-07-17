import process from "node:process";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const baseUrl = (args.get("--base-url") ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const routes = (args.get("--routes") ?? "/,/api/health/database").split(",");
const failures = [];

for (const route of routes) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const duration = Math.round(performance.now() - started);
    console.log(`${response.status} ${route} ${duration}ms`);
    if (response.status >= 500) failures.push(`${route}: ${response.status}`);
  } catch (error) {
    failures.push(`${route}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Smoke test failed:\n${failures.join("\n")}`);
  process.exit(1);
}

