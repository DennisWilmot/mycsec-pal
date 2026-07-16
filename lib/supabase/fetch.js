const DEFAULT_AUTH_TIMEOUT_MS = 3_000;

function timeoutMs() {
  const configured = Number(process.env.SUPABASE_AUTH_TIMEOUT_MS ?? DEFAULT_AUTH_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_AUTH_TIMEOUT_MS;
}

/** Bound Supabase Auth/JWKS calls so an unavailable upstream cannot pin a request. */
export async function fetchWithSupabaseTimeout(input, init = {}) {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) abortFromUpstream();
  else upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });

  const timer = setTimeout(() => controller.abort(new Error('Supabase Auth request timed out.')), timeoutMs());
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
}
