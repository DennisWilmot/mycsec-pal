'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps the display anchored to the most recent server-provided remaining time.
 * performance.now() is monotonic, so wall-clock changes do not add or remove time.
 */
export function useAttemptCountdown(attempt, fallbackSeconds = 0) {
  const [seconds, setSeconds] = useState(fallbackSeconds);
  const deadline = useRef(null);

  useEffect(() => {
    if (!attempt) {
      deadline.current = null;
      setSeconds(fallbackSeconds);
      return;
    }
    const remaining = Math.max(0, Number(attempt.remainingSeconds ?? 0));
    setSeconds(remaining);
    deadline.current = attempt.status === 'in_progress' ? performance.now() + remaining * 1000 : null;
  }, [attempt, fallbackSeconds]);

  useEffect(() => {
    const refresh = () => {
      if (deadline.current === null) return;
      setSeconds(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)));
    };
    const timer = window.setInterval(refresh, 250);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return seconds;
}
