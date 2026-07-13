import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson, serverError, validationError } from "@/lib/api/responses";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { isAttemptLifecycleError } from "./service";
import { patchAttemptFlagSchema, putAttemptResponseSchema } from "./response-validation";
import {
  readAttemptSession,
  readSubmissionCheck,
  saveAttemptResponse,
  setAttemptQuestionFlag,
} from "./session-service";

const idSchema = z.string().uuid();

function lifecycleError(error: unknown) {
  if (!isAttemptLifecycleError(error)) return null;
  return apiError(error.status, error.code, error.message);
}

function validId(value: string, field: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) return {
    value: null,
    response: apiError(422, "VALIDATION_ERROR", "Check the request and try again.", { [field]: ["Use a valid identifier."] }),
  } as const;
  return { value: parsed.data, response: null } as const;
}

export async function handleGetAttemptSession(attemptId: string) {
  try {
    const parsedId = validId(attemptId, "attemptId");
    if (parsedId.response) return parsedId.response;
    const { user } = await requireAuthenticatedUser();
    return NextResponse.json({ data: await readAttemptSession(user.id, parsedId.value) });
  } catch (error) {
    return lifecycleError(error) ?? serverError(error);
  }
}

export async function handlePutAttemptResponse(request: Request, attemptId: string, attemptQuestionId: string) {
  try {
    const parsedAttemptId = validId(attemptId, "attemptId");
    if (parsedAttemptId.response) return parsedAttemptId.response;
    const parsedQuestionId = validId(attemptQuestionId, "attemptQuestionId");
    if (parsedQuestionId.response) return parsedQuestionId.response;
    const { user } = await requireAuthenticatedUser();
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = putAttemptResponseSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);
    const response = await saveAttemptResponse(user.id, parsedAttemptId.value, parsedQuestionId.value, parsed.data);
    return NextResponse.json({ data: response });
  } catch (error) {
    return lifecycleError(error) ?? serverError(error);
  }
}

export async function handlePatchAttemptFlag(request: Request, attemptId: string, attemptQuestionId: string) {
  try {
    const parsedAttemptId = validId(attemptId, "attemptId");
    if (parsedAttemptId.response) return parsedAttemptId.response;
    const parsedQuestionId = validId(attemptQuestionId, "attemptQuestionId");
    if (parsedQuestionId.response) return parsedQuestionId.response;
    const { user } = await requireAuthenticatedUser();
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = patchAttemptFlagSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);
    const response = await setAttemptQuestionFlag(user.id, parsedAttemptId.value, parsedQuestionId.value, parsed.data);
    return NextResponse.json({ data: response });
  } catch (error) {
    return lifecycleError(error) ?? serverError(error);
  }
}

export async function handleGetSubmissionCheck(attemptId: string) {
  try {
    const parsedId = validId(attemptId, "attemptId");
    if (parsedId.response) return parsedId.response;
    const { user } = await requireAuthenticatedUser();
    return NextResponse.json({ data: await readSubmissionCheck(user.id, parsedId.value) });
  } catch (error) {
    return lifecycleError(error) ?? serverError(error);
  }
}
