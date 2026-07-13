import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase, getDatabaseClient } from "@/lib/db";
import {
  attemptQuestions,
  attemptResponses,
  questionOptions,
  questions,
} from "@/drizzle/schema";
import {
  AttemptLifecycleError,
  assertAttemptWritable,
  calculateAttemptTiming,
  getOwnedAttempt,
} from "./service";
import type { StructuredResponse } from "./response-validation";

const PRIVATE_SNAPSHOT_KEYS = new Set([
  "answer",
  "correctAnswer",
  "correctOptionId",
  "isCorrect",
  "markScheme",
  "markSchemes",
  "schemeJson",
  "solution",
  "workedSolution",
  "rubric",
  "expectedAnswer",
  "provenanceJson",
]);

function safeSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeSnapshot);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !PRIVATE_SNAPSHOT_KEYS.has(key))
    .map(([key, child]) => [key, safeSnapshot(child)]));
}

async function ownedAttemptQuestion(profileId: string, attemptId: string, attemptQuestionId: string) {
  const attempt = await getOwnedAttempt(profileId, attemptId);
  if (!attempt) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
  assertAttemptWritable(attempt);

  const [row] = await getDatabase().select({
    id: attemptQuestions.id,
    questionId: attemptQuestions.questionId,
    questionType: questions.type,
  }).from(attemptQuestions)
    .innerJoin(questions, eq(questions.id, attemptQuestions.questionId))
    .where(and(eq(attemptQuestions.id, attemptQuestionId), eq(attemptQuestions.attemptId, attempt.id)))
    .limit(1);
  if (!row) throw new AttemptLifecycleError(404, "ATTEMPT_QUESTION_NOT_FOUND", "Question not found in this attempt.");
  return { attempt, question: row };
}

export async function readAttemptSession(profileId: string, attemptId: string) {
  const attempt = await getOwnedAttempt(profileId, attemptId);
  if (!attempt) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
  const timing = calculateAttemptTiming(attempt);

  const rows = await getDatabase().select({
    attemptQuestionId: attemptQuestions.id,
    questionId: attemptQuestions.questionId,
    position: attemptQuestions.position,
    maxMarks: attemptQuestions.maxMarks,
    snapshot: attemptQuestions.questionSnapshotJson,
    type: questions.type,
    responseId: attemptResponses.id,
    selectedOptionId: attemptResponses.selectedOptionId,
    response: attemptResponses.responseJson,
    isFlagged: attemptResponses.isFlagged,
    clientRevision: attemptResponses.clientRevision,
    serverRevision: attemptResponses.serverRevision,
    answeredAt: attemptResponses.answeredAt,
  }).from(attemptQuestions)
    .innerJoin(questions, eq(questions.id, attemptQuestions.questionId))
    .leftJoin(attemptResponses, eq(attemptResponses.attemptQuestionId, attemptQuestions.id))
    .where(eq(attemptQuestions.attemptId, attempt.id))
    .orderBy(asc(attemptQuestions.position));

  const questionIds = rows.map((row) => row.questionId);
  const options = questionIds.length
    ? await getDatabase().select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      label: questionOptions.label,
      content: questionOptions.contentJson,
      sortOrder: questionOptions.sortOrder,
    }).from(questionOptions)
      .where(inArray(questionOptions.questionId, questionIds))
      .orderBy(asc(questionOptions.sortOrder))
    : [];
  const optionsByQuestion = new Map<string, typeof options>();
  for (const option of options) {
    const list = optionsByQuestion.get(option.questionId) ?? [];
    list.push(option);
    optionsByQuestion.set(option.questionId, list);
  }

  return {
    attempt: {
      id: attempt.id,
      displayCode: attempt.displayCode,
      status: timing.isExpired && attempt.status === "in_progress" ? "expired" : attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      ...timing,
    },
    questions: rows.map((row) => ({
      id: row.attemptQuestionId,
      position: row.position,
      maxMarks: row.maxMarks,
      type: row.type,
      snapshot: safeSnapshot(row.snapshot),
      options: row.type === "multiple_choice"
        ? (optionsByQuestion.get(row.questionId) ?? []).map(({ questionId: _questionId, sortOrder: _sortOrder, ...option }) => option)
        : [],
      response: row.responseId ? {
        selectedOptionId: row.selectedOptionId,
        response: row.response,
        isFlagged: row.isFlagged,
        clientRevision: row.clientRevision,
        serverRevision: row.serverRevision,
        answeredAt: row.answeredAt,
      } : null,
    })),
  };
}

type SaveResponseInput =
  | { clientRevision: number; selectedOptionId: string }
  | { clientRevision: number; response: StructuredResponse };

export async function saveAttemptResponse(profileId: string, attemptId: string, attemptQuestionId: string, input: SaveResponseInput) {
  const { question } = await ownedAttemptQuestion(profileId, attemptId, attemptQuestionId);
  const isOptionResponse = "selectedOptionId" in input;
  if ((question.questionType === "multiple_choice") !== isOptionResponse) {
    throw new AttemptLifecycleError(422, "RESPONSE_TYPE_MISMATCH", question.questionType === "multiple_choice"
      ? "Choose one of the available options."
      : "Submit structured working for this question.");
  }
  if (isOptionResponse) {
    const [validOption] = await getDatabase().select({ id: questionOptions.id }).from(questionOptions)
      .where(and(eq(questionOptions.id, input.selectedOptionId), eq(questionOptions.questionId, question.questionId)))
      .limit(1);
    if (!validOption) throw new AttemptLifecycleError(422, "INVALID_OPTION", "Choose an option from this question.");
  }

  const client = getDatabaseClient();
  const selectedOptionId = isOptionResponse ? input.selectedOptionId : null;
  const responseJson = isOptionResponse ? {} : input.response;
  const [saved] = await client<{
    id: string; client_revision: number; server_revision: number; answered_at: Date;
  }[]>`
    with writable_attempt as materialized (
      select id from attempts
      where id = ${attemptId}::uuid
        and profile_id = ${profileId}::uuid
        and status = 'in_progress'
        and expires_at > now()
      for update
    )
    insert into attempt_responses
      (attempt_question_id, profile_id, selected_option_id, response_json, answered_at, client_revision, server_revision)
    select ${attemptQuestionId}::uuid, ${profileId}::uuid, ${selectedOptionId}::uuid, ${client.json(responseJson)}, now(), ${input.clientRevision}, 1
    from writable_attempt
    on conflict (attempt_question_id) do update set
      selected_option_id = excluded.selected_option_id,
      response_json = excluded.response_json,
      answered_at = now(),
      client_revision = excluded.client_revision,
      server_revision = attempt_responses.server_revision + 1,
      updated_at = now()
    where attempt_responses.profile_id = excluded.profile_id
      and attempt_responses.client_revision < excluded.client_revision
    returning id, client_revision, server_revision, answered_at
  `;
  if (!saved) {
    const latest = await getOwnedAttempt(profileId, attemptId);
    if (!latest) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    assertAttemptWritable(latest);
    throw new AttemptLifecycleError(409, "STALE_RESPONSE_REVISION", "A newer response is already saved. Refresh before trying again.");
  }
  return { id: saved.id, clientRevision: saved.client_revision, serverRevision: saved.server_revision, answeredAt: saved.answered_at };
}

export async function setAttemptQuestionFlag(profileId: string, attemptId: string, attemptQuestionId: string, input: { clientRevision: number; isFlagged: boolean }) {
  await ownedAttemptQuestion(profileId, attemptId, attemptQuestionId);
  const client = getDatabaseClient();
  const [saved] = await client<{ id: string; client_revision: number; server_revision: number; is_flagged: boolean }[]>`
    with writable_attempt as materialized (
      select id from attempts
      where id = ${attemptId}::uuid
        and profile_id = ${profileId}::uuid
        and status = 'in_progress'
        and expires_at > now()
      for update
    )
    insert into attempt_responses
      (attempt_question_id, profile_id, response_json, is_flagged, client_revision, server_revision)
    select ${attemptQuestionId}::uuid, ${profileId}::uuid, ${client.json({})}, ${input.isFlagged}, ${input.clientRevision}, 1
    from writable_attempt
    on conflict (attempt_question_id) do update set
      is_flagged = excluded.is_flagged,
      client_revision = excluded.client_revision,
      server_revision = attempt_responses.server_revision + 1,
      updated_at = now()
    where attempt_responses.profile_id = excluded.profile_id
      and attempt_responses.client_revision < excluded.client_revision
    returning id, client_revision, server_revision, is_flagged
  `;
  if (!saved) {
    const latest = await getOwnedAttempt(profileId, attemptId);
    if (!latest) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    assertAttemptWritable(latest);
    throw new AttemptLifecycleError(409, "STALE_RESPONSE_REVISION", "A newer response is already saved. Refresh before trying again.");
  }
  return { id: saved.id, clientRevision: saved.client_revision, serverRevision: saved.server_revision, isFlagged: saved.is_flagged };
}

function hasStructuredAnswer(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  if (typeof response.finalAnswer === "string" && response.finalAnswer.trim()) return true;
  if (Array.isArray(response.workingLines) && response.workingLines.some((line) => typeof line === "string" && line.trim())) return true;
  if (Array.isArray(response.graphPoints) && response.graphPoints.length) return true;
  return response.parts && typeof response.parts === "object"
    ? Object.values(response.parts as Record<string, unknown>).some(hasStructuredAnswer)
    : false;
}

export async function readSubmissionCheck(profileId: string, attemptId: string) {
  const session = await readAttemptSession(profileId, attemptId);
  const unanswered = session.questions.filter((question) => !question.response || (question.type === "multiple_choice"
    ? !question.response.selectedOptionId
    : !hasStructuredAnswer(question.response.response)));
  const flagged = session.questions.filter((question) => question.response?.isFlagged);
  const writable = session.attempt.status === "in_progress" && !session.attempt.isExpired;
  return {
    canSubmit: writable,
    totalQuestions: session.questions.length,
    answeredCount: session.questions.length - unanswered.length,
    unanswered: unanswered.map(({ id, position }) => ({ attemptQuestionId: id, position })),
    flagged: flagged.map(({ id, position }) => ({ attemptQuestionId: id, position })),
    status: session.attempt.status,
    remainingSeconds: session.attempt.remainingSeconds,
  };
}
