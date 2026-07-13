'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

async function request(url, init) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Your paper could not be updated.');
  return payload.data;
}

export function useAttemptSession(attemptId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(attemptId));
  const [error, setError] = useState('');
  const revisions = useRef(new Map());

  const load = useCallback(async () => {
    if (!attemptId) return;
    setLoading(true);
    setError('');
    try {
      const data = await request(`/api/attempts/${attemptId}/session`);
      data.questions.forEach((question) => revisions.current.set(question.id, question.response?.clientRevision || 0));
      setSession(data);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!attemptId || session?.attempt?.status !== 'in_progress') return undefined;
    const heartbeat = () => request(`/api/attempts/${attemptId}/heartbeat`, { method: 'POST' }).catch(() => {});
    const timer = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(timer);
  }, [attemptId, session?.attempt?.status]);

  const mutateQuestion = useCallback((questionId, updater) => {
    setSession((current) => current ? {
      ...current,
      questions: current.questions.map((question) => question.id === questionId ? updater(question) : question),
    } : current);
  }, []);

  const saveResponse = useCallback(async (questionId, response) => {
    if (!attemptId) return null;
    const clientRevision = (revisions.current.get(questionId) || 0) + 1;
    revisions.current.set(questionId, clientRevision);
    try {
      const saved = await request(`/api/attempts/${attemptId}/questions/${questionId}/response`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientRevision, ...response }),
      });
      mutateQuestion(questionId, (question) => ({
        ...question,
        response: { ...question.response, ...response, ...saved },
      }));
      return saved;
    } catch (caught) {
      setError(caught.message);
      throw caught;
    }
  }, [attemptId, mutateQuestion]);

  const setFlag = useCallback(async (questionId, isFlagged) => {
    if (!attemptId) return null;
    const clientRevision = (revisions.current.get(questionId) || 0) + 1;
    revisions.current.set(questionId, clientRevision);
    mutateQuestion(questionId, (question) => ({ ...question, response: { ...question.response, isFlagged } }));
    try {
      return await request(`/api/attempts/${attemptId}/questions/${questionId}/flag`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientRevision, isFlagged }),
      });
    } catch (caught) {
      setError(caught.message);
      await load();
      throw caught;
    }
  }, [attemptId, load, mutateQuestion]);

  const pause = useCallback(async () => {
    if (!attemptId) return null;
    const attempt = await request(`/api/attempts/${attemptId}/pause`, { method: 'POST' });
    setSession((current) => current ? { ...current, attempt: { ...current.attempt, ...attempt } } : current);
    return attempt;
  }, [attemptId]);

  const submit = useCallback(async () => {
    if (!attemptId) return null;
    const storageKey = `mycsecpal:submit-key:${attemptId}`;
    let idempotencyKey = window.sessionStorage.getItem(storageKey);
    if (!idempotencyKey) {
      idempotencyKey = `submit:${attemptId}:${globalThis.crypto.randomUUID()}`;
      window.sessionStorage.setItem(storageKey, idempotencyKey);
    }
    try {
      const result = await request(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
      });
      setSession((current) => current ? { ...current, attempt: { ...current.attempt, status: 'submitted' } } : current);
      return result;
    } catch (caught) {
      setError(caught.message);
      throw caught;
    }
  }, [attemptId]);

  return { session, loading, error, setError, saveResponse, setFlag, pause, submit };
}
