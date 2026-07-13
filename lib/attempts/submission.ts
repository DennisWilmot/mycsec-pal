import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  attemptEvents,
  attempts,
  idempotencyKeys,
  markingJobs,
  outboxEvents,
  papers,
  paperVersions,
} from "@/drizzle/schema";
import { AttemptLifecycleError, calculateAttemptTiming } from "./service";

const SUBMIT_OPERATION = "submit_attempt";

export async function submitAttempt(profileId: string, attemptId: string, idempotencyKey: string) {
  return getDatabase().transaction(async (tx) => {
    const [savedKey] = await tx.select({ response: idempotencyKeys.responseJson })
      .from(idempotencyKeys)
      .where(and(
        eq(idempotencyKeys.profileId, profileId),
        eq(idempotencyKeys.operation, SUBMIT_OPERATION),
        eq(idempotencyKeys.key, idempotencyKey),
      ))
      .limit(1);
    if (savedKey?.response) return { ...(savedKey.response as Record<string, unknown>), replayed: true };

    const [lockedAttempt] = await tx.select()
      .from(attempts)
      .where(and(eq(attempts.id, attemptId), eq(attempts.profileId, profileId)))
      .for("update")
      .limit(1);
    if (!lockedAttempt) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    const [paper] = await tx.select({ paperType: papers.paperType })
      .from(paperVersions)
      .innerJoin(papers, eq(papers.id, paperVersions.paperId))
      .where(eq(paperVersions.id, lockedAttempt.paperVersionId))
      .limit(1);
    if (!paper) throw new AttemptLifecycleError(404, "PAPER_NOT_FOUND", "This paper is no longer available.");

    const now = new Date();
    const timing = calculateAttemptTiming(lockedAttempt, now);
    const alreadySubmitted = ["submitted", "marking", "marked", "marking_failed"].includes(lockedAttempt.status);
    if (!alreadySubmitted && !["in_progress", "paused", "expired"].includes(lockedAttempt.status)) {
      throw new AttemptLifecycleError(
        409,
        "ATTEMPT_NOT_SUBMITTABLE",
        "This paper cannot be submitted from its current state.",
        { status: lockedAttempt.status },
      );
    }

    if (!alreadySubmitted) {
      await tx.update(attempts).set({
        status: "submitted",
        submittedAt: now,
        elapsedSeconds: timing.elapsedSeconds,
        remainingSecondsAtPause: null,
        lastActivityAt: now,
        updatedAt: now,
      }).where(eq(attempts.id, attemptId));
      await tx.insert(attemptEvents).values({
        attemptId,
        type: "submitted",
        metadataJson: {
          source: timing.isExpired ? "timer_expiry" : "learner",
          elapsedSeconds: timing.elapsedSeconds,
          remainingSeconds: timing.remainingSeconds,
        },
      });
    }

    await tx.insert(markingJobs).values({ attemptId, status: "pending" })
      .onConflictDoNothing({ target: markingJobs.attemptId });
    const [job] = await tx.select({ id: markingJobs.id, status: markingJobs.status })
      .from(markingJobs).where(eq(markingJobs.attemptId, attemptId)).limit(1);
    if (!job) throw new Error("Marking job could not be created.");

    await tx.insert(outboxEvents).values({
      dedupeKey: `attempt.submitted:${attemptId}`,
      aggregateType: "attempt",
      aggregateId: attemptId,
      eventType: "attempt/submitted",
      payloadJson: { attemptId, markingJobId: job.id, paperType: paper.paperType },
    }).onConflictDoNothing({ target: outboxEvents.dedupeKey });

    const response = {
      attemptId,
      markingJobId: job.id,
      status: alreadySubmitted ? lockedAttempt.status : "submitted",
      paperType: paper.paperType,
      submittedAt: lockedAttempt.submittedAt ?? now,
    };
    await tx.insert(idempotencyKeys).values({
      profileId,
      operation: SUBMIT_OPERATION,
      key: idempotencyKey,
      responseJson: response,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    }).onConflictDoNothing();
    return { ...response, replayed: alreadySubmitted };
  });
}
