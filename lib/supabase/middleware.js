import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getSupabasePublicConfig } from './config';
import { fetchWithSupabaseTimeout } from './fetch';

export async function updateSupabaseSession(request) {
  const config = getSupabasePublicConfig();

  // Local UI work remains available before auth credentials are supplied.
  // Auth actions themselves return AUTH_NOT_CONFIGURED and never fake a user.
  if (!config.configured) {
    return { response: NextResponse.next({ request }), user: null, configured: false };
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    global: { fetch: fetchWithSupabaseTimeout },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Do not place logic between client creation and getUser: it can interfere
  // with token refresh and cause sessions to end unexpectedly.
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user: user ?? null, configured: true };
}
