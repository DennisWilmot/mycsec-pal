import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const stageIndex = process.argv.indexOf("--stage");
const stage = stageIndex >= 0 ? process.argv[stageIndex + 1] : "implementation";
if (!["research", "plan", "implementation", "wrap-up"].includes(stage)) throw new Error(`Unsupported stage: ${stage}`);
const git = (args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `agent/reviews/${stamp}-${stage}.md`;
const packet = `# Independent review packet: ${stage}\n\nSummary: Portable evidence packet for an independent ${stage} review.\nUse when: Sending this work stage to a different model/provider.\nOwner: Implementing agent and independent reviewer.\nLast verified: ${new Date().toISOString().slice(0, 10)}.\nIntegrity: This packet is not a completed review.\nDisposition: Record findings and resolutions in the active worksheet.\n\nReview this MyCSECPal ${stage} artifact independently. Do not assume the implementation is correct. Separate facts from inference, cite file paths and lines, rank severity, and identify missing evidence.\n\nUse these personas: maintainer, security, performance/reliability, CSEC product/domain, test skeptic, and AI-smell reviewer.\n\n## Repository state\n\n\`\`\`text\n${git(["status", "--short", "--branch"])}\n\`\`\`\n\n## Recent commits\n\n\`\`\`text\n${git(["log", "-5", "--oneline"])}\n\`\`\`\n\n## Diff summary\n\n\`\`\`text\n${git(["diff", "--stat"])}\n\`\`\`\n\n## Required output\n\n1. Findings ordered by severity.\n2. Evidence and reproduction/validation gaps.\n3. Recommended changes.\n4. Release recommendation: proceed, proceed with conditions, or block.\n`;
await mkdir("agent/reviews", { recursive: true });
await writeFile(file, packet);
console.log(file);
if (process.env.AGENT_REVIEW_COMMAND) console.log("AGENT_REVIEW_COMMAND is configured; invoke it explicitly with the generated packet after reviewing its command and data boundary.");
else console.log("No external reviewer command configured. Send this packet to a different model/provider manually.");
