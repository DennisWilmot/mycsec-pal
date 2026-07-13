import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAuthenticationRequiredError } from "@/lib/supabase/auth";

export type FieldErrors = Record<string, string[]>;

export function apiError(status: number, code: string, message: string, fields?: FieldErrors) {
  return NextResponse.json(
    { error: { code, message, ...(fields && Object.keys(fields).length ? { fields } : {}) } },
    { status },
  );
}

export function validationError(error: ZodError) {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path.length ? issue.path.join(".") : "body";
    fields[field] ??= [];
    fields[field].push(issue.message);
  }
  return apiError(422, "VALIDATION_ERROR", "Check the highlighted fields and try again.", fields);
}

export async function parseJson(request: Request) {
  try {
    return { data: await request.json(), response: null } as const;
  } catch {
    return {
      data: null,
      response: apiError(400, "INVALID_JSON", "The request body must be valid JSON."),
    } as const;
  }
}

export function serverError(error: unknown) {
  if (isAuthenticationRequiredError(error)) {
    return apiError(error.status, error.code, error.message);
  }
  console.error(error);
  return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
