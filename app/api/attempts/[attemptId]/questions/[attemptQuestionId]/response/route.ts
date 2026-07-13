import { handlePutAttemptResponse } from "@/lib/attempts/session-handlers";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ attemptId: string; attemptQuestionId: string }> }) {
  const { attemptId, attemptQuestionId } = await context.params;
  return handlePutAttemptResponse(request, attemptId, attemptQuestionId);
}
