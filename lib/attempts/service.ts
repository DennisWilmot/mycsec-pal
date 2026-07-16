import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  attemptEvents,
  attemptQuestions,
  attempts,
  idempotencyKeys,
  markSchemes,
  markingJobs,
  outboxEvents,
  paperBlueprintSlots,
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

type BlueprintSlot = typeof paperBlueprintSlots.$inferSelect;
type QuestionRow = typeof questions.$inferSelect;

function stableRank(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function assembleQuestions(
  tx: any,
  paperVersion: typeof paperVersions.$inferSelect,
  profileId: string,
  assemblyKey: string,
): Promise<Array<{ question: QuestionRow; position: number }>> {
  const slots = await tx.select().from(paperBlueprintSlots)
    .where(eq(paperBlueprintSlots.paperVersionId, paperVersion.id))
    .orderBy(asc(paperBlueprintSlots.position)) as BlueprintSlot[];

  // Compatibility path for catalogues that have not received the exam-spine migration yet.
  if (slots.length === 0) {
    const fixed = await tx.select().from(questions)
      .where(and(eq(questions.paperVersionId, paperVersion.id), eq(questions.status, "published")))
      .orderBy(asc(questions.questionNumber)) as QuestionRow[];
    return fixed.map((question, index) => ({ question, position: index + 1 }));
  }
  if (slots.length !== paperVersion.questionCount) {
    throw new AttemptLifecycleError(409, "PAPER_NOT_READY", "This paper's exam spine is incomplete.");
  }

  const candidateRows = await tx.execute(sql`
    select q.*, coalesce(array_agg(distinct qt.topic_id) filter (where qt.topic_id is not null), '{}') as topic_ids,
      count(distinct aq.id)::int as exposure_count,
      max(a.created_at) filter (where a.profile_id = ${profileId}) as last_seen_at
    from questions q
    inner join paper_versions pv on pv.id = q.paper_version_id
    left join question_topics qt on qt.question_id = q.id
    left join attempt_questions aq on aq.question_id = q.id
    left join attempts a on a.id = aq.attempt_id
    where pv.paper_id = ${paperVersion.paperId}
      and pv.syllabus_version_id = ${paperVersion.syllabusVersionId}
      and q.status = 'published'
    group by q.id
  `);
  const candidates = (candidateRows as Array<Record<string, any>>).map((row) => ({
    question: {
      id: row.id, externalId: row.external_id, paperVersionId: row.paper_version_id,
      questionNumber: row.question_number, moduleNumber: row.module_number,
      objectiveCode: row.objective_code, assessmentProfile: row.assessment_profile,
      difficulty: row.difficulty, type: row.type, promptJson: row.prompt_json,
      totalMarks: row.total_marks, assetUrl: row.asset_url, status: row.status,
      provenanceJson: row.provenance_json, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    } as QuestionRow,
    topicIds: (row.topic_ids ?? []) as string[],
    exposureCount: Number(row.exposure_count ?? 0),
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
  }));

  const recentlySeenCutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const used = new Set<string>();
  const lockedVersionByGroup = new Map<string, string>();
  const matchesSlot = (candidate: typeof candidates[number], slot: typeof slots[number]) => {
    const { question, topicIds } = candidate;
    return question.moduleNumber === slot.moduleNumber
      && question.assessmentProfile === slot.assessmentProfile
      && question.difficulty === slot.difficulty
      && question.type === slot.questionType
      && question.totalMarks === slot.marks
      && (!slot.topicId || topicIds.includes(slot.topicId));
  };
  const compatibleVersionsByGroup = new Map<string, Set<string>>();
  for (const slot of slots) {
    if (!slot.selectionGroup?.startsWith("block:") || compatibleVersionsByGroup.has(slot.selectionGroup)) continue;
    const groupSlots = slots.filter((candidateSlot) => candidateSlot.selectionGroup === slot.selectionGroup);
    const versionIds = [...new Set(candidates.map((candidate) => candidate.question.paperVersionId))];
    const compatible = new Set(versionIds.filter((versionId) => {
      const versionCandidates = candidates.filter((candidate) => candidate.question.paperVersionId === versionId);
      const orderedSlots = [...groupSlots].sort((left, right) =>
        versionCandidates.filter((candidate) => matchesSlot(candidate, left)).length
        - versionCandidates.filter((candidate) => matchesSlot(candidate, right)).length);
      const candidateToSlot = new Map<string, number>();
      const assign = (slotIndex: number, visited: Set<string>): boolean => {
        for (const candidate of versionCandidates) {
          if (visited.has(candidate.question.id) || !matchesSlot(candidate, orderedSlots[slotIndex])) continue;
          visited.add(candidate.question.id);
          const previousSlot = candidateToSlot.get(candidate.question.id);
          if (previousSlot === undefined || assign(previousSlot, visited)) {
            candidateToSlot.set(candidate.question.id, slotIndex);
            return true;
          }
        }
        return false;
      };
      return orderedSlots.every((_, slotIndex) => assign(slotIndex, new Set()));
    }));
    compatibleVersionsByGroup.set(slot.selectionGroup, compatible);
  }
  return slots.map((slot) => {
    const lockedVersion = slot.selectionGroup?.startsWith("block:") ? lockedVersionByGroup.get(slot.selectionGroup) : null;
    const compatibleVersions = slot.selectionGroup ? compatibleVersionsByGroup.get(slot.selectionGroup) : null;
    const eligible = candidates.filter((candidate) =>
      !used.has(candidate.question.id)
      && (!lockedVersion || candidate.question.paperVersionId === lockedVersion)
      && (!compatibleVersions || compatibleVersions.has(candidate.question.paperVersionId))
      && matchesSlot(candidate, slot)
    );
    eligible.sort((left, right) => {
      const leftRecent = left.lastSeenAt && left.lastSeenAt.getTime() >= recentlySeenCutoff ? 1 : 0;
      const rightRecent = right.lastSeenAt && right.lastSeenAt.getTime() >= recentlySeenCutoff ? 1 : 0;
      return leftRecent - rightRecent
        || left.exposureCount - right.exposureCount
        || stableRank(`${assemblyKey}:${slot.position}:${left.question.id}`)
          - stableRank(`${assemblyKey}:${slot.position}:${right.question.id}`);
    });
    const chosen = eligible[0];
    if (!chosen) {
      throw new AttemptLifecycleError(409, "PAPER_NOT_READY", `No approved question can fill exam-spine slot ${slot.position}.`);
    }
    used.add(chosen.question.id);
    if (slot.selectionGroup?.startsWith("block:") && !lockedVersion) {
      lockedVersionByGroup.set(slot.selectionGroup, chosen.question.paperVersionId);
    }
    return { question: chosen.question, position: slot.position };
  });
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
      const durationSeconds = paperVersion.durationSeconds;

      const paidAccess = await tx.execute(sql`
        select 1 from subscriptions
        where profile_id = ${profileId}
          and status in ('active', 'trialing')
        order by updated_at desc
        limit 1
      `);
      if (!paidAccess[0]) {
        const promotionAccess = await tx.execute(sql`
          select pc.daily_attempt_limit, pr.expires_at
          from promotion_redemptions pr
          inner join promotion_codes pc on pc.id = pr.promotion_code_id
          where pr.profile_id = ${profileId}
            and pr.expires_at > now()
            and pc.active = true
            and (pc.starts_at is null or pc.starts_at <= now())
            and (pc.ends_at is null or pc.ends_at > now())
          order by pc.daily_attempt_limit desc, pr.expires_at desc
          limit 1
        `);
        const betaAccess = promotionAccess[0] as { daily_attempt_limit?: number; expires_at?: string } | undefined;
        const dailyUsage = betaAccess ? await tx.execute(sql`
          select count(*)::int as used
          from attempts
          where profile_id = ${profileId}
            and (created_at at time zone 'America/Jamaica')::date =
                (now() at time zone 'America/Jamaica')::date
        `) : await tx.execute(sql`
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
        const dailyLimit = betaAccess ? Number(betaAccess.daily_attempt_limit) : 1;
        if (used >= dailyLimit) {
          const paperNumber = paper.paperType === "paper_1" ? 1 : 2;
          throw new AttemptLifecycleError(
            429,
            "DAILY_ATTEMPT_LIMIT_REACHED",
            betaAccess
              ? `Your beta access includes ${dailyLimit} paper attempts per day. Try again tomorrow.`
              : `Your Guest plan includes one Paper ${paperNumber} attempt per day. Try again tomorrow or upgrade to Practice for unlimited attempts.`,
            { plan: betaAccess ? "beta" : "guest", paperNumber, dailyLimit, timeZone: "America/Jamaica", expiresAt: betaAccess?.expires_at },
          );
        }
      }

      const assembledQuestions = await assembleQuestions(tx, paperVersion, profileId, idempotencyKey);
      const selectedQuestions = assembledQuestions.map(({ question }) => question);
      if (selectedQuestions.length !== paperVersion.questionCount) {
        throw new AttemptLifecycleError(409, "PAPER_NOT_READY", "This paper is not ready to start.");
      }

      const questionIds = selectedQuestions.map((question) => question.id);
      const [parts, options] = await Promise.all([
        tx.select().from(questionParts).where(inArray(questionParts.questionId, questionIds)).orderBy(asc(questionParts.sortOrder)),
        tx.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds)).orderBy(asc(questionOptions.sortOrder)),
      ]);
      const partIds = parts.map((part) => part.id);
      const schemes = partIds.length
        ? await tx.select().from(markSchemes)
          .where(inArray(markSchemes.questionPartId, partIds))
          .orderBy(asc(markSchemes.version))
        : [];
      const schemeByPart = new Map(schemes.map((scheme) => [scheme.questionPartId, scheme]));
      const now = new Date();
      const [created] = await tx.insert(attempts).values({
        displayCode: displayCode(),
        profileId,
        paperVersionId,
        startedAt: now,
        expiresAt: new Date(now.getTime() + durationSeconds * 1000),
        lastActivityAt: now,
      }).returning();

      await tx.insert(attemptQuestions).values(assembledQuestions.map(({ question, position }) => ({
        attemptId: created.id,
        questionId: question.id,
        position,
        maxMarks: question.totalMarks,
        questionSnapshotJson: {
          snapshotVersion: 2,
          externalId: question.externalId,
          questionNumber: question.questionNumber,
          moduleNumber: question.moduleNumber,
          objectiveCode: question.objectiveCode,
          assessmentProfile: question.assessmentProfile,
          difficulty: question.difficulty,
          type: question.type,
          prompt: question.promptJson,
          assetUrl: question.assetUrl,
          parts: parts.filter((part) => part.questionId === question.id).map((part) => {
            const scheme = schemeByPart.get(part.id);
            return {
              id: part.id,
              externalId: part.externalId,
              parentPartId: part.parentPartId,
              label: part.label,
              prompt: part.promptJson,
              responseType: part.responseType,
              marks: part.marks,
              sortOrder: part.sortOrder,
              markScheme: scheme?.schemeJson ?? null,
              markSchemeVersion: scheme?.version ?? null,
            };
          }),
          options: options.filter((option) => option.questionId === question.id).map((option) => ({
            id: option.id,
            label: option.label,
            content: option.contentJson,
            sortOrder: option.sortOrder,
            isCorrect: option.isCorrect,
          })),
        },
      })));
      await tx.insert(attemptEvents).values({
        attemptId: created.id,
        type: "started",
        metadataJson: {
          paperVersionId,
          durationSeconds,
          assembly: assembledQuestions.map(({ question, position }) => ({ position, questionId: question.id })),
        },
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
  if (action === "heartbeat") return heartbeatAttempt(profileId, attemptId);

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

async function heartbeatAttempt(profileId: string, attemptId: string) {
  const now = new Date();
  const [updated] = await getDatabase().update(attempts).set({
    elapsedSeconds: sql`${attempts.elapsedSeconds} + greatest(
      0,
      floor(extract(epoch from (now() - ${attempts.lastActivityAt})))::integer
    )`,
    lastActivityAt: now,
    updatedAt: now,
  }).where(and(
    eq(attempts.id, attemptId),
    eq(attempts.profileId, profileId),
    eq(attempts.status, "in_progress"),
    gt(attempts.expiresAt, now),
  )).returning();

  if (updated) return publicAttempt(updated, now);

  // State transitions and timer expiry are uncommon. Keep their stricter
  // locking path out of the normal heartbeat request.
  const attempt = await getOwnedAttempt(profileId, attemptId);
  if (!attempt) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
  if (attempt.status === "in_progress" && calculateAttemptTiming(attempt, now).isExpired) {
    const expired = await autoSubmitExpiredAttempt(profileId, attemptId);
    if (expired.status === "submitted") {
      throw new AttemptLifecycleError(409, "ATTEMPT_EXPIRED", "Time ended and the paper was submitted for marking.");
    }
  }
  throw invalidTransition(attempt.status, "heartbeat");
}

function invalidTransition(status: string, action: string) {
  return new AttemptLifecycleError(409, "INVALID_ATTEMPT_TRANSITION", `A ${status} attempt cannot be ${action}d.`, {
    status,
    action,
  });
}
