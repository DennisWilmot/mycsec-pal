import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from './config';

/** Returns null when Supabase auth is intentionally not configured locally. */
export async function createSupabaseServerClient() {
  const { configured, url, anonKey } = getSupabasePublicConfig();
  if (!configured) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Middleware refreshes the
          // session before protected pages render.
        }
      },
    },
  });
}
