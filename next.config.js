/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/**' },
      { protocol: 'https', hostname: 'www.themoviedb.org', pathname: '/**' },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // script-src and script-src-elem should match to be safe
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'unsafe-hashes' https://vercel.live https://*.vercel-scripts.com https://*.vercel.com",
      "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com https://*.vercel.com",
      // style-src handles your Google Fonts and inline styles
      "style-src 'self' 'unsafe-inline' 'unsafe-hashes' https://fonts.googleapis.com",
      "img-src 'self' blob: data: https://image.tmdb.org https://www.themoviedb.org",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://*.vercel-scripts.com https://*.vercel-insights.com https://vitals.vercel-insights.com",
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
      "frame-src 'self' https://vercel.live https://*.vercel.com",
      "object-src 'none'",
      "base-uri 'self'",
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

module.exports = nextConfig;