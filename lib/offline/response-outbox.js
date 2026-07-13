'use client';

const DB_NAME = 'mycsecpal-offline';
const STORE = 'attempt-mutations';

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
      store.createIndex('attemptId', 'attemptId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = operation(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function queueAttemptMutation(mutation) {
  return transaction('readwrite', (store) => store.put({
    ...mutation,
    key: `${mutation.attemptId}:${mutation.questionId}:${mutation.kind}`,
    queuedAt: Date.now(),
  }));
}

export async function listAttemptMutations(attemptId) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).index('attemptId').getAll(attemptId);
    request.onsuccess = () => resolve(request.result.sort((a, b) => a.queuedAt - b.queuedAt));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export function removeAttemptMutation(key) {
  return transaction('readwrite', (store) => store.delete(key));
}
