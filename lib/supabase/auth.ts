import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './server';

export class AuthenticationRequiredError extends Error {
  readonly code = 'AUTHENTICATION_REQUIRED';
  readonly status = 401;

  constructor(message = 'You must be signed in to continue.') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

/** Returns the verified Supabase user, or null when signed out/unconfigured. */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/** Stable API helper contract for authenticated route handlers. */
export async function requireAuthenticatedUser(): Promise<{ user: User }> {
  const user = await getAuthenticatedUser();
  if (!user) throw new AuthenticationRequiredError();
  return { user };
}

/**
 * Returns verified JWT claims without trusting browser-supplied user data.
 * Supabase may return null claims for an expired or absent session.
 */
export async function getAuthenticatedClaims() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  if (error) return null;
  return data?.claims ?? null;
}

export function isAuthenticationRequiredError(
  error: unknown,
): error is AuthenticationRequiredError {
  return error instanceof AuthenticationRequiredError;
}
