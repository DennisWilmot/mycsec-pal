import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to run Drizzle Kit commands.");
}

export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
