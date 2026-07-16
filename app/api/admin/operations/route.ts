import { NextResponse } from "next/server";
import { apiError, serverError } from "@/lib/api/responses";
import { getDatabaseClient } from "@/lib/db";
import { isOperationsAdmin } from "@/lib/security/admin";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    if (!isOperationsAdmin(user)) return apiError(403, "ADMIN_REQUIRED", "Operations access is restricted.");
    const sql = getDatabaseClient();
    const [outbox, marking, failures, connections] = await Promise.all([
      sql`select status,count(*)::int count,min(created_at) oldest from outbox_events group by status order by status`,
      sql`select status,count(*)::int count,min(created_at) oldest from marking_jobs group by status order by status`,
      sql`select a.display_code,s.name subject,p.paper_type,mj.attempt_count,left(coalesce(mj.last_error,''),300) last_error,mj.updated_at from marking_jobs mj join attempts a on a.id=mj.attempt_id join paper_versions pv on pv.id=a.paper_version_id join papers p on p.id=pv.paper_id join subjects s on s.id=p.subject_id where mj.status='failed' order by mj.updated_at desc limit 25`,
      sql`select current_setting('max_connections')::int max_connections,count(*)::int current_connections from pg_stat_activity`,
    ]);
    return NextResponse.json({ data: { generatedAt: new Date().toISOString(), outbox, marking, failures, connections: connections[0] } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return serverError(error);
  }
}
