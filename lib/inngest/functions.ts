import { inngest } from "./client";
import { dispatchOutboxBatch } from "./outbox";
import { markPaperOneAttempt, recordMarkingFailure } from "./mark-paper-one";

export const dispatchOutbox = inngest.createFunction(
  { id: "dispatch-transactional-outbox", retries: 3, triggers: [{ cron: "* * * * *" }] },
  async ({ step }) => step.run("claim-and-publish", () => dispatchOutboxBatch()),
);

export const markSubmittedAttempt = inngest.createFunction(
  {
    id: "mark-submitted-attempt",
    retries: 5,
    concurrency: [{ limit: 20 }],
    triggers: [{ event: "attempt/submitted" }],
    onFailure: async ({ event, error }) => {
      const original = event.data.event.data as Record<string, unknown>;
      const attemptId = String(original.attemptId ?? "");
      const markingJobId = String(original.markingJobId ?? "");
      if (attemptId && markingJobId) {
        await recordMarkingFailure(attemptId, markingJobId, error.message);
      }
    },
  },
  async ({ event, step }) => {
    const attemptId = String(event.data.attemptId ?? "");
    const markingJobId = String(event.data.markingJobId ?? "");
    if (!attemptId || !markingJobId) throw new Error("Missing attemptId or markingJobId.");
    return step.run("mark-paper", () => markPaperOneAttempt(attemptId, markingJobId));
  },
);

export const inngestFunctions = [dispatchOutbox, markSubmittedAttempt];
