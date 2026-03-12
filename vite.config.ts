import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from "vite";

// Security: Content Security Policy plugin
const cspPlugin = (): Plugin => {
  const isVsCodeSession = process.env.TERM_PROGRAM === "vscode";
  const allowVsCodeSimpleBrowser =
    process.env.ALLOW_VSCODE_SIMPLE_BROWSER === "true" || isVsCodeSession;

  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
    "img-src 'self' blob: data: https: https://image.tmdb.org https://www.themoviedb.org https://*.supabase.co",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://vercel.live https://va.vercel-scripts.com wss://*.vercel.com",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vercel.live",
    allowVsCodeSimpleBrowser
      ? "frame-ancestors 'self' vscode-webview: https://*.vscode-cdn.net https://*.vscode-webview.net"
      : "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join("; ");

  return {
    name: "csp-plugin",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>`, // Removed meta http-equiv="Content-Security-Policy"
      );
    },
    configureServer(server) {
      // set CSP header on all responses during dev
      server.middlewares.use((req, res, next) => {
        res.setHeader("Content-Security-Policy", policy);
        res.setHeader("X-Content-Type-Options", "nosniff");
        // VS Code Simple Browser renders pages in an iframe/webview.
        // When enabled, skip X-Frame-Options because DENY/SAMEORIGIN would block it.
        if (!allowVsCodeSimpleBrowser) {
          res.setHeader("X-Frame-Options", "DENY");
        }
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader(
          "Permissions-Policy",
          "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
        );
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains; preload",
        );
        next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseProjectId = env.VITE_SUPABASE_PROJECT_ID?.trim();
  const supabaseUrl =
    env.VITE_SUPABASE_URL?.trim() ||
    (supabaseProjectId
      ? `https://${supabaseProjectId}.supabase.co`
      : undefined);

  let supabaseOrigin: string | undefined;
  if (supabaseUrl) {
    try {
      supabaseOrigin = new URL(supabaseUrl).origin;
    } catch {
      supabaseOrigin = undefined;
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: supabaseOrigin
        ? {
            "/functions/v1": {
              target: supabaseOrigin,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
    plugins: [react(), cspPlugin()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "react-dom/client": path.resolve(
          __dirname,
          "node_modules/react-dom/client",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-motion": ["framer-motion"],
            "vendor-icons": ["lucide-react"],
            "vendor-i18n": ["i18next", "react-i18next"],
            "vendor-supabase": ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
