import { readOwnedResult } from "@/lib/results/service";
import { requireAuthenticatedIdentity } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  let user;
  try {
    ({ user } = await requireAuthenticatedIdentity());
  } catch {
    return Response.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "You must be signed in to view this report." } }, { status: 401 });
  }
  const { attemptId } = await params;
  if (!UUID.test(attemptId)) {
    return Response.json({ error: { code: "INVALID_ATTEMPT_ID", message: "This report link is invalid." } }, { status: 400 });
  }
  const report = await readOwnedResult(user.id, attemptId);
  if (!report) {
    return Response.json({ error: { code: "ATTEMPT_NOT_FOUND", message: "Attempt not found." } }, { status: 404 });
  }
  return Response.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
