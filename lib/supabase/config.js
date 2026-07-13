const PUBLIC_SUPABASE_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
    missing: PUBLIC_SUPABASE_KEYS.filter((key) => !process.env[key]?.trim()),
  };
}

export function getSupabaseConfigurationError() {
  const { configured, missing } = getSupabasePublicConfig();

  if (configured) return null;

  return {
    code: 'AUTH_NOT_CONFIGURED',
    message: `Supabase authentication is not configured. Add ${missing.join(' and ')} to the environment.`,
    missing,
  };
}

export function requireSupabasePublicConfig() {
  const config = getSupabasePublicConfig();

  if (!config.configured) {
    const error = getSupabaseConfigurationError();
    throw new Error(error.message);
  }

  return { url: config.url, anonKey: config.anonKey };
}
