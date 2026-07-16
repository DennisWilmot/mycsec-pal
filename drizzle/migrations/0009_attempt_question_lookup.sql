CREATE INDEX IF NOT EXISTS "attempt_questions_question_idx"
ON "attempt_questions" USING btree ("question_id");
