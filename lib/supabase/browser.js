'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from './config';

let browserClient;

/**
 * Returns null when auth has not been configured. UI auth actions should show
 * getSupabaseConfigurationError() rather than simulating a signed-in session.
 */
export function createSupabaseBrowserClient() {
  const { configured, url, anonKey } = getSupabasePublicConfig();
  if (!configured) return null;

  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}
