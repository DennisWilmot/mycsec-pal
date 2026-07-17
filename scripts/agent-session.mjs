import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [action, rawSlug] = process.argv.slice(2);
if (action !== "new" || !rawSlug) {
  console.error("Usage: npm run agent:session -- new short-task-name");
  process.exit(1);
}
const slug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (!slug) throw new Error("Session slug is empty after normalization");
const date = new Date().toISOString().slice(0, 10);
const destination = path.join("agent", "sessions", `${date}-${slug}.md`);
const template = await readFile(path.join("agent", "templates", "session.md"), "utf8");
const content = template.replaceAll("{{TITLE}}", slug.replaceAll("-", " ")).replaceAll("{{OWNER}}", "agent and repository owner").replaceAll("{{DATE}}", date).replaceAll("{{SLUG}}", slug);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, content, { flag: "wx" });
console.log(destination);

