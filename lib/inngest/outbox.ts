import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { publishAttemptEvent } from "@/lib/events/attempt-stream";
import { inngest } from "./client";

type ClaimedEvent = {
  id: string;
  event_type: string;
  payload_json: Record<string, unknown>;
};

const MAX_ATTEMPTS = 12;

/**
 * Claims and publishes a bounded outbox batch. Rows are claimed with
 * SKIP LOCKED so overlapping cron executions cannot double-publish them.
 * Inngest also receives the stable outbox id as its event id for deduplication.
 */
export async function dispatchOutboxBatch(limit = 50) {
  const db = getDatabase();
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`
      with candidates as (
        select id
        from outbox_events
        where status in ('pending', 'failed')
          and available_at <= now()
          and attempts < ${MAX_ATTEMPTS}
        order by created_at
        limit ${limit}
        for update skip locked
      )
      update outbox_events o
      set status = 'publishing',
          attempts = o.attempts + 1,
          updated_at = now(),
          last_error = null
      from candidates c
      where o.id = c.id
      returning o.id, o.event_type, o.payload_json
    `);
    return rows as unknown as ClaimedEvent[];
  });

  let published = 0;
  let failed = 0;
  for (const event of claimed) {
    try {
      await inngest.send({
        id: event.id,
        name: event.event_type,
        data: event.payload_json,
      });
      const attemptId = event.payload_json.attemptId;
      if (event.event_type.startsWith("attempt/") && typeof attemptId === "string") {
        await publishAttemptEvent(attemptId, event.event_type, event.payload_json);
      }
      await db.execute(sql`
        update outbox_events
        set status = 'published', published_at = now(), updated_at = now()
        where id = ${event.id} and status = 'publishing'
      `);
      published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Inngest publish error";
      await db.execute(sql`
        update outbox_events
        set status = case when attempts >= ${MAX_ATTEMPTS} then 'failed'::outbox_status else 'pending'::outbox_status end,
            available_at = now() + make_interval(secs => least(300, (2 ^ least(attempts, 8))::int)),
            last_error = ${message.slice(0, 4000)},
            updated_at = now()
        where id = ${event.id} and status = 'publishing'
      `);
      failed += 1;
    }
  }

  return { claimed: claimed.length, published, failed };
}
