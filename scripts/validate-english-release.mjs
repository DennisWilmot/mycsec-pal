import { validateEnglishCandidates } from "../drizzle/seed-data/english.ts";

const result = validateEnglishCandidates();
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
