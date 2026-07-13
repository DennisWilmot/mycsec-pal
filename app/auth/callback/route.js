import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseConfigurationError } from '@/lib/supabase/config';

function safeNextPath(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/practice';
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

  return NextResponse.redirect(new URL(next, url.origin));
}
