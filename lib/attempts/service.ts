import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  attemptEvents,
  attemptQuestions,
  attempts,
  idempotencyKeys,
  markingJobs,
  outboxEvents,
  papers,
  paperVersions,
  questionOptions,
  questionParts,
  questions,
} from "@/drizzle/schema";

type AttemptRow = typeof attempts.$inferSelect;

export class AttemptLifecycleError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AttemptLifecycleError";
  }
}

export function isAttemptLifecycleError(error: unknown): error is AttemptLifecycleError {
  return error instanceof AttemptLifecycleError;
}

export function calculateAttemptTiming(attempt: AttemptRow, now = new Date()) {
  if (attempt.status === "paused") {
    const remainingSeconds = Math.max(0, attempt.remainingSecondsAtPause ?? 0);
    return {
      remainingSeconds,
      elapsedSeconds: attempt.elapsedSeconds,
      isExpired: remainingSeconds === 0,
    };
  }

  if (attempt.status === "in_progress") {
    const remainingSeconds = Math.max(
      0,
      Math.ceil((attempt.expiresAt.getTime() - now.getTime()) / 1000),
    );
    const activeSinceLastActivity = Math.max(
      0,
      Math.floor((now.getTime() - attempt.lastActivityAt.getTime()) / 1000),
    );
    return {
      remainingSeconds,
      elapsedSeconds: attempt.elapsedSeconds + activeSinceLastActivity,
      isExpired: remainingSeconds === 0,
    };
  }

  return {
    remainingSeconds: 0,
    elapsedSeconds: attempt.elapsedSeconds,
    isExpired: attempt.status === "expired",
  };
}

export async function getOwnedAttempt(profileId: string, attemptId: string) {
  const [attempt] = await getDatabase()
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.profileId, profileId)))
    .limit(1);
  return attempt ?? null;
}

export function assertAttemptWritable(attempt: AttemptRow, now = new Date()) {
  if (attempt.status !== "in_progress") {
    throw new AttemptLifecycleError(
      409,
      "ATTEMPT_NOT_WRITABLE",
      attempt.status === "paused"
        ? "Resume this attempt before changing an answer."
        : "This attempt no longer accepts answers.",
      { status: attempt.status },
    );
  }
  if (calculateAttemptTiming(attempt, now).isExpired) {
    throw new AttemptLifecycleError(409, "ATTEMPT_EXPIRED", "The time for this paper has ended.");
  }
}

function publicAttempt(attempt: AttemptRow, now = new Date()) {
  const timing = calculateAttemptTiming(attempt, now);
  return {
    id: attempt.id,
    displayCode: attempt.displayCode,
    paperVersionId: attempt.paperVersionId,
    status: timing.isExpired && ["in_progress", "paused"].includes(attempt.status)
      ? "expired"
      : attempt.status,
    startedAt: attempt.startedAt,
    pausedAt: attempt.pausedAt,
    expiresAt: attempt.expiresAt,
    lastActivityAt: attempt.lastActivityAt,
    elapsedSeconds: timing.elapsedSeconds,
    remainingSeconds: timing.remainingSeconds,
  };
}

async function expireLockedAttempt(tx: any, attempt: AttemptRow, now: Date) {
  const timing = calculateAttemptTiming(attempt, now);
  if (!timing.isExpired || !["in_progress", "paused"].includes(attempt.status)) return attempt;
  const [submitted] = await tx
    .update(attempts)
    .set({
      status: "submitted",
      submittedAt: now,
      elapsedSeconds: timing.elapsedSeconds,
      remainingSecondsAtPause: 0,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(attempts.id, attempt.id))
    .returning();
  await tx.insert(attemptEvents).values({
    attemptId: attempt.id,
    type: "expired",
    metadataJson: { elapsedSeconds: timing.elapsedSeconds, source: "server_timer", autoSubmitted: true },
  });
  await tx.insert(markingJobs).values({ attemptId: attempt.id, status: "pending" })
    .onConflictDoNothing({ target: markingJobs.attemptId });
  const [job] = await tx.select({ id: markingJobs.id }).from(markingJobs)
    .where(eq(markingJobs.attemptId, attempt.id)).limit(1);
  if (!job) throw new Error("Expired attempt marking job could not be created.");
  await tx.insert(outboxEvents).values({
    dedupeKey: `attempt.submitted:${attempt.id}`,
    aggregateType: "attempt",
    aggregateId: attempt.id,
    eventType: "attempt/submitted",
    payloadJson: { attemptId: attempt.id, markingJobId: job.id, source: "timer_expiry" },
  }).onConflictDoNothing({ target: outboxEvents.dedupeKey });
  return submitted;
}

export async function autoSubmitExpiredAttempt(profileId: string, attemptId: string) {
  return getDatabase().transaction(async (tx) => {
    const result = await tx.execute(sql`
      select * from attempts where id = ${attemptId} and profile_id = ${profileId} limit 1 for update
    `);
    if (!result[0]) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    return expireLockedAttempt(tx, databaseRowToAttempt(result[0] as Record<string, any>), new Date());
  });
}

export async function getActiveAttempt(profileId: string) {
  return getDatabase().transaction(async (tx) => {
    const result = await tx.execute(sql`
      select * from attempts
      where profile_id = ${profileId} and status in ('in_progress', 'paused')
      order by created_at desc limit 1 for update
    `);
    const raw = result[0] as Record<string, any> | undefined;
    if (!raw) return null;
    const attempt = databaseRowToAttempt(raw);
    const current = await expireLockedAttempt(tx, attempt, new Date());
    return ["in_progress", "paused"].includes(current.status) ? publicAttempt(current) : null;
  });
}

function databaseRowToAttempt(row: Record<string, any>): AttemptRow {
  return {
    id: row.id,
    displayCode: row.display_code,
    profileId: row.profile_id,
    paperVersionId: row.paper_version_id,
    status: row.status,
    startedAt: new Date(row.started_at),
    pausedAt: row.paused_at ? new Date(row.paused_at) : null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
    expiresAt: new Date(row.expires_at),
    elapsedSeconds: row.elapsed_seconds,
    remainingSecondsAtPause: row.remaining_seconds_at_pause,
    lastActivityAt: new Date(row.last_activity_at),
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function displayCode() {
  return `ATT-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export async function createAttempt(profileId: string, paperVersionId: string, idempotencyKey: string) {
  const db = getDatabase();
  const existingKey = await db
    .select({ responseJson: idempotencyKeys.responseJson })
    .from(idempotencyKeys)
    .where(and(
      eq(idempotencyKeys.profileId, profileId),
      eq(idempotencyKeys.operation, "create_attempt"),
      eq(idempotencyKeys.key, idempotencyKey),
    ))
    .limit(1);
  if (existingKey[0]?.responseJson) {
    const response = existingKey[0].responseJson as any;
    if (response.paperVersionId !== paperVersionId) {
      throw new AttemptLifecycleError(409, "IDEMPOTENCY_KEY_REUSED", "Use a new idempotency key for a different paper.");
    }
    return { attempt: response, replayed: true };
  }

  try {
    return await db.transaction(async (tx) => {
      // Serialize starts per learner so the free daily quota cannot be bypassed
      // by two requests arriving at the same time.
      const profileLock = await tx.execute(sql`
        select id from profiles where id = ${profileId} limit 1 for update
      `);
      if (!profileLock[0]) {
        throw new AttemptLifecycleError(404, "PROFILE_NOT_FOUND", "Finish setting up your profile first.");
      }

      const activeResult = await tx.execute(sql`
        select * from attempts
        where profile_id = ${profileId} and status in ('in_progress', 'paused')
        order by created_at desc limit 1 for update
      `);
      if (activeResult[0]) {
        const active = await expireLockedAttempt(tx, databaseRowToAttempt(activeResult[0] as any), new Date());
        if (["in_progress", "paused"].includes(active.status)) {
          throw new AttemptLifecycleError(409, "ACTIVE_ATTEMPT_EXISTS", "Resume or cancel your active paper first.", {
            attempt: publicAttempt(active),
          });
        }
      }

      const [paperVersion] = await tx
        .select()
        .from(paperVersions)
        .where(and(eq(paperVersions.id, paperVersionId), eq(paperVersions.status, "published")))
        .limit(1);
      if (!paperVersion) {
        throw new AttemptLifecycleError(404, "PAPER_VERSION_NOT_FOUND", "This paper is not available.");
      }

      const [paper] = await tx
        .select({ paperType: papers.paperType })
        .from(papers)
        .where(eq(papers.id, paperVersion.paperId))
        .limit(1);
      if (!paper) {
        throw new AttemptLifecycleError(404, "PAPER_NOT_FOUND", "This paper is not available.");
      }

      const paidAccess = await tx.execute(sql`
        select 1 from subscriptions
        where profile_id = ${profileId}
          and status in ('active', 'trialing')
        order by updated_at desc
        limit 1
      `);
      if (!paidAccess[0]) {
        const dailyUsage = await tx.execute(sql`
          select count(*)::int as used
          from attempts a
          inner join paper_versions pv on pv.id = a.paper_version_id
          inner join papers p on p.id = pv.paper_id
          where a.profile_id = ${profileId}
            and p.paper_type = ${paper.paperType}
            and (a.created_at at time zone 'America/Jamaica')::date =
                (now() at time zone 'America/Jamaica')::date
        `);
        const used = Number((dailyUsage[0] as { used?: number } | undefined)?.used ?? 0);
        if (used >= 1) {
          const paperNumber = paper.paperType === "paper_1" ? 1 : 2;
          throw new AttemptLifecycleError(
            429,
            "DAILY_ATTEMPT_LIMIT_REACHED",
            `Your Guest plan includes one Paper ${paperNumber} attempt per day. Try again tomorrow or upgrade to Practice for unlimited attempts.`,
            { plan: "guest", paperNumber, dailyLimit: 1, timeZone: "America/Jamaica" },
          );
        }
      }

      const selectedQuestions = await tx
        .select()
        .from(questions)
        .where(and(eq(questions.paperVersionId, paperVersionId), eq(questions.status, "published")))
        .orderBy(asc(questions.questionNumber));
      if (selectedQuestions.length !== paperVersion.questionCount) {
        throw new AttemptLifecycleError(409, "PAPER_NOT_READY", "This paper is not ready to start.");
      }

      const questionIds = selectedQuestions.map((question) => question.id);
      const [parts, options] = await Promise.all([
        tx.select().from(questionParts).where(inArray(questionParts.questionId, questionIds)).orderBy(asc(questionParts.sortOrder)),
        tx.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds)).orderBy(asc(questionOptions.sortOrder)),
      ]);
      const now = new Date();
      const [created] = await tx.insert(attempts).values({
        displayCode: displayCode(),
        profileId,
        paperVersionId,
        startedAt: now,
        expiresAt: new Date(now.getTime() + paperVersion.durationSeconds * 1000),
        lastActivityAt: now,
      }).returning();

      await tx.insert(attemptQuestions).values(selectedQuestions.map((question, index) => ({
        attemptId: created.id,
        questionId: question.id,
        position: index + 1,
        maxMarks: question.totalMarks,
        questionSnapshotJson: {
          externalId: question.externalId,
          questionNumber: question.questionNumber,
          moduleNumber: question.moduleNumber,
          objectiveCode: question.objectiveCode,
          assessmentProfile: question.assessmentProfile,
          difficulty: question.difficulty,
          type: question.type,
          prompt: question.promptJson,
          assetUrl: question.assetUrl,
          parts: parts.filter((part) => part.questionId === question.id).map((part) => ({
            id: part.id,
            externalId: part.externalId,
            parentPartId: part.parentPartId,
            label: part.label,
            prompt: part.promptJson,
            responseType: part.responseType,
            marks: part.marks,
            sortOrder: part.sortOrder,
          })),
          options: options.filter((option) => option.questionId === question.id).map((option) => ({
            id: option.id,
            label: option.label,
            content: option.contentJson,
            sortOrder: option.sortOrder,
          })),
        },
      })));
      await tx.insert(attemptEvents).values({
        attemptId: created.id,
        type: "started",
        metadataJson: { paperVersionId, durationSeconds: paperVersion.durationSeconds },
      });
      const response = publicAttempt(created, now);
      await tx.insert(idempotencyKeys).values({
        profileId,
        operation: "create_attempt",
        key: idempotencyKey,
        responseJson: response,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
      return { attempt: response, replayed: false };
    });
  } catch (error: any) {
    if (isAttemptLifecycleError(error)) throw error;
    if (error?.code === "23503") {
      throw new AttemptLifecycleError(404, "PROFILE_NOT_FOUND", "Finish setting up your profile first.");
    }
    if (error?.code === "23505") {
      const replay = await db
        .select({ responseJson: idempotencyKeys.responseJson })
        .from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.profileId, profileId), eq(idempotencyKeys.operation, "create_attempt"), eq(idempotencyKeys.key, idempotencyKey)))
        .limit(1);
      if (replay[0]?.responseJson) return { attempt: replay[0].responseJson as any, replayed: true };
      throw new AttemptLifecycleError(409, "ACTIVE_ATTEMPT_EXISTS", "Resume or cancel your active paper first.");
    }
    throw error;
  }
}

export async function transitionAttempt(
  profileId: string,
  attemptId: string,
  action: "pause" | "resume" | "cancel" | "heartbeat",
) {
  return getDatabase().transaction(async (tx) => {
    const result = await tx.execute(sql`
      select * from attempts where id = ${attemptId} and profile_id = ${profileId} limit 1 for update
    `);
    if (!result[0]) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    const attempt = databaseRowToAttempt(result[0] as any);
    const now = new Date();
    const current = await expireLockedAttempt(tx, attempt, now);
    if (current.status === "submitted" && attempt.status !== "submitted") {
      throw new AttemptLifecycleError(409, "ATTEMPT_EXPIRED", "Time ended and the paper was submitted for marking.");
    }

    if (action === "heartbeat") {
      if (current.status !== "in_progress") throw invalidTransition(current.status, action);
      const timing = calculateAttemptTiming(current, now);
      const [updated] = await tx.update(attempts).set({
        elapsedSeconds: timing.elapsedSeconds,
        lastActivityAt: now,
        updatedAt: now,
      }).where(eq(attempts.id, current.id)).returning();
      return publicAttempt(updated, now);
    }

    if (action === "pause") {
      if (current.status !== "in_progress") throw invalidTransition(current.status, action);
      const timing = calculateAttemptTiming(current, now);
      const [updated] = await tx.update(attempts).set({
        status: "paused",
        pausedAt: now,
        elapsedSeconds: timing.elapsedSeconds,
        remainingSecondsAtPause: timing.remainingSeconds,
        lastActivityAt: now,
        updatedAt: now,
      }).where(eq(attempts.id, current.id)).returning();
      await tx.insert(attemptEvents).values({ attemptId, type: "paused", metadataJson: { remainingSeconds: timing.remainingSeconds } });
      return publicAttempt(updated, now);
    }

    if (action === "resume") {
      if (current.status !== "paused") throw invalidTransition(current.status, action);
      const remainingSeconds = current.remainingSecondsAtPause ?? 0;
      const [updated] = await tx.update(attempts).set({
        status: "in_progress",
        pausedAt: null,
        remainingSecondsAtPause: null,
        expiresAt: new Date(now.getTime() + remainingSeconds * 1000),
        lastActivityAt: now,
        updatedAt: now,
      }).where(eq(attempts.id, current.id)).returning();
      await tx.insert(attemptEvents).values({ attemptId, type: "resumed", metadataJson: { remainingSeconds } });
      return publicAttempt(updated, now);
    }

    if (!["in_progress", "paused"].includes(current.status)) throw invalidTransition(current.status, action);
    const timing = calculateAttemptTiming(current, now);
    const [updated] = await tx.update(attempts).set({
      status: "cancelled",
      cancelledAt: now,
      elapsedSeconds: timing.elapsedSeconds,
      remainingSecondsAtPause: current.status === "paused" ? timing.remainingSeconds : null,
      lastActivityAt: now,
      updatedAt: now,
    }).where(eq(attempts.id, current.id)).returning();
    await tx.insert(attemptEvents).values({ attemptId, type: "cancelled", metadataJson: { previousStatus: current.status } });
    return publicAttempt(updated, now);
  });
}

function invalidTransition(status: string, action: string) {
  return new AttemptLifecycleError(409, "INVALID_ATTEMPT_TRANSITION", `A ${status} attempt cannot be ${action}d.`, {
    status,
    action,
  });
}
