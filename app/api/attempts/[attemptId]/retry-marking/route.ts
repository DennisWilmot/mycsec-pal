import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, serverError } from "@/lib/api/responses";
import { retryOwnedMarking } from "@/lib/attempts/marking-retry";
import { AttemptLifecycleError } from "@/lib/attempts/service";
import { allowRequest } from "@/lib/security/rate-limit";
import { requireAuthenticatedIdentity } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";
const identifier = z.uuid();

export async function POST(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const { user } = await requireAuthenticatedIdentity();
    if (!(await allowRequest(`marking-retry:${user.id}`, 3, 600)).allowed) {
      return apiError(429, "RATE_LIMITED", "Too many marking retries. Wait a few minutes and try again.");
    }
    const { attemptId } = await context.params;
    if (!identifier.safeParse(attemptId).success) return apiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    return NextResponse.json({ data: await retryOwnedMarking(user.id, attemptId) }, { status: 202 });
  } catch (error) {
    if (error instanceof AttemptLifecycleError) return apiError(error.status, error.code, error.message);
    return serverError(error);
  }
}
