import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = performance.now();

  try {
    const sql = getDatabaseClient();
    await sql`select 1 as healthy`;

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        latencyMs: Math.round(performance.now() - startedAt),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Database health check failed", error);

    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
