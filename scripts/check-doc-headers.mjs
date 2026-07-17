import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["AGENT_WORKFLOW.md", "TODOS.md", "docs", "agent"];
const required = ["Summary:", "Use when:", "Owner:", "Last verified:"];
const ignored = new Set(["docs/generated"]);

async function collect(entry) {
  const stat = await import("node:fs/promises").then(({ stat }) => stat(entry));
  if (stat.isFile()) return entry.endsWith(".md") ? [entry] : [];
  if (ignored.has(entry)) return [];
  const children = await readdir(entry);
  return (await Promise.all(children.map((child) => collect(path.join(entry, child))))).flat();
}

const files = (await Promise.all(roots.map(collect))).flat();
const failures = [];

for (const file of files) {
  if (file.endsWith("SKILL.md") || file.includes("/templates/")) continue;
  const lines = (await readFile(file, "utf8")).split(/\r?\n/).slice(0, 9);
  for (const field of required) {
    if (!lines.some((line) => line.startsWith(field))) failures.push(`${file}: missing ${field} near top`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Living-doc headers valid (${files.length} Markdown files inspected).`);

