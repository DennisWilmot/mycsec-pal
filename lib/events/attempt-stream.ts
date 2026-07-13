import type { RedisClientType } from "redis";
import { getRedisClient } from "./redis";

export type AttemptStreamPayload = Record<string, unknown>;

export type AttemptStreamEvent = {
  id: string;
  type: string;
  attemptId: string;
  occurredAt: string;
  payload: AttemptStreamPayload;
};

export function attemptStreamKey(attemptId: string) {
  return `mycsecpal:attempt:${attemptId}:events`;
}

/** Publish after durable state is committed. Stream IDs provide resumable SSE cursors. */
export async function publishAttemptEvent(
  attemptId: string,
  type: string,
  payload: AttemptStreamPayload = {},
) {
  const redis = await getRedisClient();
  return redis.xAdd(
    attemptStreamKey(attemptId),
    "*",
    {
      type,
      attemptId,
      occurredAt: new Date().toISOString(),
      payload: JSON.stringify(payload),
    },
    { TRIM: { strategy: "MAXLEN", strategyModifier: "~", threshold: 1_000 } },
  );
}

export function decodeAttemptStreamEvent(
  id: string,
  message: Record<string, string>,
): AttemptStreamEvent | null {
  if (!message.type || !message.attemptId) return null;
  try {
    return {
      id,
      type: message.type,
      attemptId: message.attemptId,
      occurredAt: message.occurredAt || new Date().toISOString(),
      payload: message.payload ? JSON.parse(message.payload) : {},
    };
  } catch {
    return null;
  }
}

export async function latestAttemptStreamId(client: RedisClientType, attemptId: string) {
  const entries = await client.xRevRange(attemptStreamKey(attemptId), "+", "-", { COUNT: 1 });
  return entries[0]?.id ?? "0-0";
}

export function isRedisStreamId(value: string | null): value is string {
  return Boolean(value && /^\d+-\d+$/.test(value));
}
