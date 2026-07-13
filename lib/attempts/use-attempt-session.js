'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listAttemptMutations, queueAttemptMutation, removeAttemptMutation } from '@/lib/offline/response-outbox';

class RequestError extends Error { constructor(message, status = 0) { super(message); this.status = status; } }

async function request(url, init) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(payload?.error?.message || 'Your paper could not be updated.', response.status);
  return payload.data;
}

export function useAttemptSession(attemptId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(attemptId));
  const [error, setError] = useState('');
  const [syncState, setSyncState] = useState('saved');
  const [queuedCount, setQueuedCount] = useState(0);
  const revisions = useRef(new Map());
  const pendingResponses = useRef(new Set());

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

  const flushOutbox = useCallback(async () => {
    if (!attemptId || !navigator.onLine) return false;
    const mutations = await listAttemptMutations(attemptId);
    if (!mutations.length) { setQueuedCount(0); setSyncState('saved'); return true; }
    setSyncState('saving');
    for (const mutation of mutations) {
      try {
        await request(mutation.url, mutation.init);
        await removeAttemptMutation(mutation.key);
      } catch (caught) {
        if (caught.status >= 400 && caught.status < 500) await removeAttemptMutation(mutation.key);
        else { setSyncState('offline'); setQueuedCount((await listAttemptMutations(attemptId)).length); return false; }
      }
    }
    setQueuedCount(0); setSyncState('saved'); return true;
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return undefined;
    void listAttemptMutations(attemptId).then((items) => { setQueuedCount(items.length); if (items.length) setSyncState('offline'); });
    const online = () => void flushOutbox();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [attemptId, flushOutbox]);

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
    const url = `/api/attempts/${attemptId}/questions/${questionId}/response`;
    const init = {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientRevision, ...response }),
      };
    const operation = (async () => {
      setSyncState('saving');
      try {
        const saved = await request(url, init);
        mutateQuestion(questionId, (question) => ({
          ...question,
          response: { ...question.response, ...response, ...saved },
        }));
        setSyncState('saved');
        return saved;
      } catch (caught) {
        if (!navigator.onLine || !caught.status || caught.status >= 500) {
          await queueAttemptMutation({ attemptId, questionId, kind: 'response', url, init });
          setQueuedCount((await listAttemptMutations(attemptId)).length);
          setSyncState('offline');
          mutateQuestion(questionId, (question) => ({ ...question, response: { ...question.response, ...response, clientRevision } }));
          return { clientRevision, queued: true };
        }
        setError(caught.message);
        throw caught;
      }
    })();
    pendingResponses.current.add(operation);
    try { return await operation; }
    finally { pendingResponses.current.delete(operation); }
  }, [attemptId, mutateQuestion]);

  const settlePendingResponses = useCallback(async () => {
    const pending = [...pendingResponses.current];
    if (pending.length) await Promise.allSettled(pending);
  }, []);

  const setFlag = useCallback(async (questionId, isFlagged) => {
    if (!attemptId) return null;
    const clientRevision = (revisions.current.get(questionId) || 0) + 1;
    revisions.current.set(questionId, clientRevision);
    mutateQuestion(questionId, (question) => ({ ...question, response: { ...question.response, isFlagged } }));
    const url = `/api/attempts/${attemptId}/questions/${questionId}/flag`;
    const init = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientRevision, isFlagged }),
      };
    setSyncState('saving');
    try {
      const saved = await request(url, init);
      setSyncState('saved');
      return saved;
    } catch (caught) {
      if (!navigator.onLine || !caught.status || caught.status >= 500) {
        await queueAttemptMutation({ attemptId, questionId, kind: 'flag', url, init });
        setQueuedCount((await listAttemptMutations(attemptId)).length);
        setSyncState('offline');
        return { clientRevision, isFlagged, queued: true };
      }
      setError(caught.message);
      await load();
      throw caught;
    }
  }, [attemptId, load, mutateQuestion]);

  const pause = useCallback(async () => {
    if (!attemptId) return null;
    await settlePendingResponses();
    await flushOutbox();
    const result = await request(`/api/attempts/${attemptId}/pause`, { method: 'POST' });
    const attempt = result?.attempt || result;
    setSession((current) => current ? { ...current, attempt: { ...current.attempt, ...attempt } } : current);
    return attempt;
  }, [attemptId, flushOutbox, settlePendingResponses]);

  const resume = useCallback(async () => {
    if (!attemptId) return null;
    const result = await request(`/api/attempts/${attemptId}/resume`, { method: 'POST' });
    const attempt = result?.attempt || result;
    setSession((current) => current ? { ...current, attempt: { ...current.attempt, ...attempt } } : current);
    await flushOutbox();
    await load();
    return attempt;
  }, [attemptId, flushOutbox, load]);

  const submit = useCallback(async () => {
    if (!attemptId) return null;
    await settlePendingResponses();
    const flushed = await flushOutbox();
    if (!flushed || (await listAttemptMutations(attemptId)).length) throw new Error('Reconnect so your queued answers can save before submitting.');
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
  }, [attemptId, flushOutbox, settlePendingResponses]);

  return { session, loading, error, setError, saveResponse, setFlag, pause, resume, submit, syncState, queuedCount, flushOutbox };
}
