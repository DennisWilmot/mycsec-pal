import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

type DatabaseClient = {
  client: Sql;
  db: PostgresJsDatabase;
};

const globalForDatabase = globalThis as typeof globalThis & {
  myCsecPalDatabase?: DatabaseClient;
};

function createDatabaseClient(): DatabaseClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  // Supabase transaction-mode poolers do not support prepared statements.
  const client = postgres(connectionString, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    client,
    db: drizzle(client),
  };
}

export function getDatabase(): PostgresJsDatabase {
  if (!globalForDatabase.myCsecPalDatabase) {
    globalForDatabase.myCsecPalDatabase = createDatabaseClient();
  }

  return globalForDatabase.myCsecPalDatabase.db;
}

export function getDatabaseClient(): Sql {
  if (!globalForDatabase.myCsecPalDatabase) {
    globalForDatabase.myCsecPalDatabase = createDatabaseClient();
  }

  return globalForDatabase.myCsecPalDatabase.client;
}
