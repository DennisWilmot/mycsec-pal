import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, serverError } from "@/lib/api/responses";
import { requireAuthenticatedIdentity } from "@/lib/supabase/auth";
import { AttemptLifecycleError } from "@/lib/attempts/service";
import { submitAttempt } from "@/lib/attempts/submission";
import { allowRequest } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const identifier = z.uuid();
const idempotencyKey = z.string().trim().min(8).max(160).regex(/^[A-Za-z0-9._:-]+$/);

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const { user } = await requireAuthenticatedIdentity();
    if (!(await allowRequest(`attempt-submit:${user.id}`, 10, 60)).allowed) return apiError(429, "RATE_LIMITED", "Too many submit requests. Wait a moment and try again.");
    const { attemptId } = await context.params;
    if (!identifier.safeParse(attemptId).success) return apiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    const parsedKey = idempotencyKey.safeParse(request.headers.get("idempotency-key"));
    if (!parsedKey.success) {
      return apiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Send a unique Idempotency-Key header when submitting a paper.");
    }
    const result = await submitAttempt(user.id, attemptId, parsedKey.data);
    return NextResponse.json({ data: result }, { status: result.replayed ? 200 : 202 });
  } catch (error) {
    if (error instanceof AttemptLifecycleError) {
      return apiError(error.status, error.code, error.message);
    }
    return serverError(error);
  }
}
