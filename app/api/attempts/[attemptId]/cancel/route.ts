import { handleAttemptTransition } from "@/lib/attempts/handlers";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  return handleAttemptTransition(context.params, "cancel");
}
