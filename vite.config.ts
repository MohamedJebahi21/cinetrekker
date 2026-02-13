import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from 'vite';

// Security: Content Security Policy plugin
const cspPlugin = (): Plugin => {
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'sha256-L0E2mSS27KxsHfOa0MiC8gBkUaCQNYpiRGh6VJxueVc=' https://vercel.live https://va.vercel-scripts.com",
    "script-src-elem 'self' 'unsafe-inline' 'sha256-L0E2mSS27KxsHfOa0MiC8gBkUaCQNYpiRGh6VJxueVc=' https://vercel.live https://va.vercel-scripts.com",
    "img-src 'self' blob: data: https://image.tmdb.org https://www.themoviedb.org",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
    "connect-src 'self' https://wzlcekvieglnidfempap.supabase.co https://nvssyuxghwlubxklvgrn.supabase.co https://*.supabase.co wss://*.supabase.co wss://wzlcekvieglnidfempap.supabase.co wss://nvssyuxghwlubxklvgrn.supabase.co https://api.themoviedb.org https://va.vercel-scripts.com",
    "media-src 'self' blob: https:",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vercel.live",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    name: 'csp-plugin',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}">`
      );
    },
    configureServer(server) {
      // set CSP header on all responses during dev
      server.middlewares.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', policy);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), cspPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
