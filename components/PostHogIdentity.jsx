'use client';

import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const postHogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim());

/** Links anonymous activity to the verified Supabase user without sending email or profile fields. */
export default function PostHogIdentity() {
  const identifiedUserId = useRef(null);

  useEffect(() => {
    if (!postHogConfigured) return undefined;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return undefined;
    let active = true;

    const applySession = (session, resetWhenMissing = false) => {
      if (!active) return;
      const userId = session?.user?.id || null;
      if (userId && identifiedUserId.current !== userId) {
        posthog.identify(userId);
        identifiedUserId.current = userId;
      } else if (!userId && resetWhenMissing && identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session)).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session, event === 'SIGNED_OUT');
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}

