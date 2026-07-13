import { and, eq } from "drizzle-orm";
import { attempts } from "@/drizzle/schema";
import { getDatabase } from "@/lib/db";
import {
  attemptStreamKey,
  decodeAttemptStreamEvent,
  isRedisStreamId,
  latestAttemptStreamId,
} from "@/lib/events/attempt-stream";
import { duplicateRedisClient } from "@/lib/events/redis";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;

function encodeSse(event: string, data: unknown, id?: string) {
  return encoder.encode(`${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  let user;
  try {
    ({ user } = await requireAuthenticatedUser());
  } catch {
    return Response.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "You must be signed in to continue." } }, { status: 401 });
  }

  const { attemptId } = await params;
  const db = getDatabase();
  const [attempt] = await db
    .select({
      id: attempts.id,
      status: attempts.status,
      submittedAt: attempts.submittedAt,
      updatedAt: attempts.updatedAt,
    })
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.profileId, user.id)))
    .limit(1);

  if (!attempt) {
    return Response.json({ error: { code: "ATTEMPT_NOT_FOUND", message: "Attempt not found." } }, { status: 404 });
  }

  let redis;
  try {
    redis = await duplicateRedisClient();
  } catch {
    return Response.json({ error: { code: "EVENT_STREAM_UNAVAILABLE", message: "Live result updates are temporarily unavailable." } }, { status: 503 });
  }

  const suppliedCursor = request.headers.get("last-event-id");
  // Capture the stream frontier before the initial snapshot. Events committed while
  // the snapshot is read are then delivered by XREAD, closing the usual SSE race.
  let cursor = isRedisStreamId(suppliedCursor)
    ? suppliedCursor
    : await latestAttemptStreamId(redis, attemptId);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = async () => {
        if (closed) return;
        closed = true;
        try { await redis.quit(); } catch { redis.destroy(); }
        try { controller.close(); } catch {}
      };

      request.signal.addEventListener("abort", close, { once: true });
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      controller.enqueue(encodeSse("snapshot", {
        attemptId: attempt.id,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        updatedAt: attempt.updatedAt,
      }));
      if (["marked", "marking_failed"].includes(attempt.status)) {
        void close();
        return;
      }

      void (async () => {
        while (!closed) {
          try {
            const response = await redis.xRead(
              [{ key: attemptStreamKey(attemptId), id: cursor }],
              { BLOCK: HEARTBEAT_MS, COUNT: 50 },
            );
            if (!response) {
              controller.enqueue(encoder.encode(": keep-alive\n\n"));
              continue;
            }
            for (const item of response) {
              for (const message of item.messages) {
                cursor = message.id;
                const event = decodeAttemptStreamEvent(message.id, message.message);
                if (event) {
                  controller.enqueue(encodeSse(event.type, event, event.id));
                  if (["attempt/marked", "attempt/marking_failed"].includes(event.type)) {
                    await close();
                    return;
                  }
                }
              }
            }
          } catch (error) {
            if (!closed) {
              console.error("Attempt SSE stream failed", error);
              controller.enqueue(encodeSse("stream-error", { message: "Live updates were interrupted. Reconnecting…" }));
            }
            await close();
          }
        }
      })();
    },
    cancel() {
      return redis.quit().catch(() => redis.destroy());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
