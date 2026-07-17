const development = process.env.NODE_ENV === "development";
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const posthogAssetsHost = posthogHost.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.");
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} ${posthogHost} ${posthogAssetsHost}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${posthogHost} ${posthogAssetsHost}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() { return [{ source: "/(.*)", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  ] }]; },
};
export default nextConfig;
