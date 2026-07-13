import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseConfigurationError } from '@/lib/supabase/config';

function safeNextPath(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/practice';
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function publicRedirectOrigin(request, requestUrl) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    try {
      const configuredOrigin = new URL(configuredUrl);
      if (process.env.NODE_ENV !== 'production' || !isLoopbackHost(configuredOrigin.hostname)) {
        return configuredOrigin.origin;
      }
    } catch {
      // Fall through to the trusted proxy host or the production domain.
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedHostname = forwardedHost?.split(':')[0]?.toLowerCase();
  if (forwardedHost && ['mycsecpal.com', 'www.mycsecpal.com'].includes(forwardedHostname)) {
    return `https://${forwardedHost}`;
  }

  // Some deployment proxies expose their internal localhost:8080 origin to
  // route handlers. Never send a production user back to that internal host.
  return process.env.NODE_ENV === 'production' ? 'https://mycsecpal.com' : requestUrl.origin;
}

export async function GET(request) {
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) {
    return NextResponse.json(configurationError, { status: 503 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.json(
      { code: 'AUTH_CODE_MISSING', message: 'The authentication callback did not include a code.' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.json(
      { code: 'AUTH_CALLBACK_FAILED', message: 'We could not complete sign in. Please try again.' },
      { status: 400 },
    );
  }

  return NextResponse.redirect(new URL(next, publicRedirectOrigin(request, url)));
}
