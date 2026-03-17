/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/**' },
      { protocol: 'https', hostname: 'www.themoviedb.org', pathname: '/**' },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'sha256-L0E2mSS27KxsHfOa0MiC8gBkUaCQNYpiRGh6VJxueVc=' https://va.vercel-scripts.com https://vercel.live",
      "script-src-elem 'self' 'sha256-L0E2mSS27KxsHfOa0MiC8gBkUaCQNYpiRGh6VJxueVc=' https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' blob: data: https://image.tmdb.org https://www.themoviedb.org",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://va.vercel-scripts.com https://vercel.live",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;