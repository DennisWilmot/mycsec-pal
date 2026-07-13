import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson, serverError, validationError } from "@/lib/api/responses";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import {
  createAttempt,
  getActiveAttempt,
  isAttemptLifecycleError,
  transitionAttempt,
} from "./service";

const createAttemptSchema = z.object({
  paperVersionId: z.uuid("Choose a valid paper version."),
}).strict();

const attemptIdSchema = z.uuid();
const idempotencyKeySchema = z.string().trim().min(8).max(160).regex(/^[A-Za-z0-9._:-]+$/);

function lifecycleError(error: unknown) {
  if (isAttemptLifecycleError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }
  return serverError(error);
}

export async function handleCreateAttempt(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const key = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
    if (!key.success) {
      return apiError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Send a unique Idempotency-Key header when starting a paper.",
      );
    }
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = createAttemptSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);

    const result = await createAttempt(user.id, parsed.data.paperVersionId, key.data);
    return NextResponse.json(
      { data: { attempt: result.attempt, replayed: result.replayed } },
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    return lifecycleError(error);
  }
}

export async function handleGetActiveAttempt() {
  try {
    const { user } = await requireAuthenticatedUser();
    return NextResponse.json({ data: { attempt: await getActiveAttempt(user.id) } });
  } catch (error) {
    return lifecycleError(error);
  }
}

export async function handleAttemptTransition(
  params: Promise<{ attemptId: string }>,
  action: "pause" | "resume" | "cancel" | "heartbeat",
) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { attemptId } = await params;
    if (!attemptIdSchema.safeParse(attemptId).success) {
      return apiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    }
    const attempt = await transitionAttempt(user.id, attemptId, action);
    return NextResponse.json({ data: { attempt } });
  } catch (error) {
    return lifecycleError(error);
  }
}
