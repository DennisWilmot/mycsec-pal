import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { AttemptLifecycleError } from "./service";

type RetryRow = { attempt_status: string; marking_job_id: string; job_status: string; attempt_count: number };

export async function retryOwnedMarking(profileId: string, attemptId: string) {
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx.execute(sql`
      select a.status attempt_status, mj.id marking_job_id, mj.status job_status, mj.attempt_count
      from attempts a
      join marking_jobs mj on mj.attempt_id = a.id
      where a.id = ${attemptId} and a.profile_id = ${profileId}
      for update of a, mj
    `) as unknown as RetryRow[];
    if (!row) throw new AttemptLifecycleError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
    if (row.attempt_status !== "marking_failed" || row.job_status !== "failed") {
      throw new AttemptLifecycleError(409, "MARKING_NOT_RETRYABLE", "This paper is not waiting for a marking retry.");
    }

    await tx.execute(sql`update attempts set status='submitted', updated_at=now() where id=${attemptId}`);
    await tx.execute(sql`update marking_jobs set status='pending', last_error=null, completed_at=null, updated_at=now() where id=${row.marking_job_id}`);
    await tx.execute(sql`
      insert into outbox_events(dedupe_key, aggregate_type, aggregate_id, event_type, payload_json)
      values(
        ${`attempt.marking_retry:${attemptId}:${row.attempt_count}`},
        'attempt', ${attemptId}, 'attempt/submitted',
        ${JSON.stringify({ attemptId, markingJobId: row.marking_job_id, source: "learner_retry" })}::jsonb
      )
      on conflict(dedupe_key) do nothing
    `);
    await tx.execute(sql`insert into attempt_events(attempt_id,type,metadata_json) values(${attemptId},'marking_retried',${JSON.stringify({ previousAttemptCount: row.attempt_count })}::jsonb)`);
    return { attemptId, status: "submitted" as const };
  });
}
