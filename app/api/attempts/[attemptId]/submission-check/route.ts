import { handleGetSubmissionCheck } from "@/lib/attempts/session-handlers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await context.params;
  return handleGetSubmissionCheck(attemptId);
}
