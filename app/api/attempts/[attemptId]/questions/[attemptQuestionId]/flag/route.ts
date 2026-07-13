import { handlePatchAttemptFlag } from "@/lib/attempts/session-handlers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ attemptId: string; attemptQuestionId: string }> }) {
  const { attemptId, attemptQuestionId } = await context.params;
  return handlePatchAttemptFlag(request, attemptId, attemptQuestionId);
}
