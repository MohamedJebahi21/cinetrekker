import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_PROXY_PATH = "/functions/v1/tmdb-proxy";
const TMDB_PROXY_EXCLUDED_PARAMS = new Set([
  "endpoint",
  "maturity_level",
  "age_verified",
]);

function normalizeSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!normalized) return undefined;
  return normalized.replace(/^Bearer\s+/i, "").trim() || undefined;
}

function writeJsonResponse(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  cacheControl = "no-store",
) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(body));
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 8_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Paths the TMDB proxy plugin should intercept
const TMDB_PROXY_PATHS = [TMDB_PROXY_PATH, "/api/tmdb-proxy"];

function makeTmdbMiddleware(
  tmdbApiKey: string | undefined,
  supabaseFallback?: { origin: string; anonKey: string },
) {
  return async (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    const url = req.url ?? "";
    if (!TMDB_PROXY_PATHS.some((p) => url.startsWith(p))) {
      next();
      return;
    }

    // If no direct TMDB key, fall back to the Supabase edge function.
    if (!tmdbApiKey) {
        if (!supabaseFallback) {
        writeJsonResponse(res, 503, {
          error: "TMDB service is not configured for local development.",
          setup: "Copy .env.example to .env.local, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.",
        });
        return;
      }
      try {
        const parsed = new URL(url, "http://localhost");
        const endpoint = parsed.searchParams.get("endpoint");
        if (
          !endpoint ||
          !endpoint.startsWith("/") ||
          endpoint.includes("..") ||
          !/^\/[a-zA-Z0-9/_-]+$/.test(endpoint)
        ) {
          writeJsonResponse(res, 400, { error: "Invalid endpoint" });
          return;
        }

        const passParams = new URLSearchParams(parsed.searchParams);
        const edgeFnUrl = `${supabaseFallback.origin}/functions/v1/tmdb-proxy?${passParams.toString()}`;
        const edgeRes = await fetchWithTimeout(edgeFnUrl, {
          headers: {
            Authorization: `Bearer ${supabaseFallback.anonKey}`,
            apikey: supabaseFallback.anonKey,
            "Content-Type": "application/json",
          },
        });

        const text = await edgeRes.text();
        if (!edgeRes.ok) {
          writeJsonResponse(res, edgeRes.status, { error: `TMDB proxy error: ${edgeRes.status}` });
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.end(text);
      } catch {
        writeJsonResponse(res, 503, {
          error: "TMDB service is temporarily unavailable in local development.",
        });
      }
      return;
    }

    try {
      const parsed = new URL(url, "http://localhost");
      const endpoint = parsed.searchParams.get("endpoint");

      if (
        !endpoint ||
        !endpoint.startsWith("/") ||
        endpoint.includes("..") ||
        !/^\/[a-zA-Z0-9/_-]+$/.test(endpoint)
      ) {
        writeJsonResponse(res, 400, { error: "Invalid endpoint" });
        return;
      }

      const tmdbParams = new URLSearchParams();
      for (const [key, value] of parsed.searchParams.entries()) {
        if (!TMDB_PROXY_EXCLUDED_PARAMS.has(key) && value) {
          tmdbParams.set(key, value);
        }
      }

      if (!tmdbParams.has("language")) tmdbParams.set("language", "en");
      if (!tmdbParams.has("page")) tmdbParams.set("page", "1");

      const isV4Token = tmdbApiKey.includes(".");
      if (!isV4Token) {
        tmdbParams.set("api_key", tmdbApiKey);
      }

      const tmdbUrl = `${TMDB_BASE_URL}${endpoint}?${tmdbParams.toString()}`;
      const response = await fetchWithTimeout(tmdbUrl, {
        headers: isV4Token
          ? {
              Authorization: `Bearer ${tmdbApiKey}`,
              "Content-Type": "application/json",
            }
          : { "Content-Type": "application/json" },
      });

      const responseText = await response.text();
      if (!response.ok) {
        writeJsonResponse(
          res,
          response.status,
          { error: `TMDB API error: ${response.status}` },
        );
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(responseText);
    } catch (error) {
      writeJsonResponse(res, 502, {
        error:
          error instanceof Error && error.name === "AbortError"
            ? "TMDB request timed out."
            : "TMDB service is temporarily unavailable.",
      });
    }
  };
}

const devTmdbProxyPlugin = (
  tmdbApiKey?: string,
  supabaseFallback?: { origin: string; anonKey: string },
): Plugin => ({
  name: "dev-tmdb-proxy",
  configureServer(server) {
    server.middlewares.use(makeTmdbMiddleware(tmdbApiKey, supabaseFallback));
  },
  configurePreviewServer(server) {
    // Also handle /api/tmdb-proxy during `vite preview` (used by E2E tests).
    // In production builds, auth headers are not sent to Supabase, so we
    // intercept here and call TMDB directly — or fall back to Supabase edge fn.
    server.middlewares.use(makeTmdbMiddleware(tmdbApiKey, supabaseFallback));
  },
});


// Security: Content Security Policy plugin
const cspPlugin = (): Plugin => {
  const isVsCodeSession = process.env.TERM_PROGRAM === "vscode";
  const allowVsCodeSimpleBrowser =
    process.env.ALLOW_VSCODE_SIMPLE_BROWSER === "true" || isVsCodeSession;

  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data: https://frontend-cdn.perplexity.ai https://r2cdn.perplexity.ai",
    "img-src 'self' blob: data: https: https://image.tmdb.org https://www.themoviedb.org https://*.supabase.co",
    "media-src 'self' blob: https: data:",
    "worker-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://vercel.live https://va.vercel-scripts.com wss://*.vercel.com",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vercel.live",
    allowVsCodeSimpleBrowser
      ? "frame-ancestors 'self' vscode-webview: https://*.vscode-cdn.net https://*.vscode-webview.net"
      : "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "require-trusted-types-for 'script'",
    "trusted-types cinetrekker default dompurify",
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
          res.setHeader("X-Frame-Options", "SAMEORIGIN");
        }
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

// Ces fragments restent chargés à la demande afin de protéger le premier rendu.
const deferredModulePreloadPatterns = [
  /vendor-charts/i,
  /EnhancedStats/i,
  /YearInReview/i,
  /Profile/i,
  /Calendar/i,
  /Recommendations/i,
  /Search-/i,
  /Details-/i,
];

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
      headers: {
        "Cache-Control": "no-store",
      },
      hmr: {
        overlay: false,
      },
      proxy: supabaseOrigin
        ? {
            "/api/tmdb-proxy": {
              target: supabaseOrigin,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api\/tmdb-proxy/, "/functions/v1/tmdb-proxy"),
            },
            "/functions/v1": {
              target: supabaseOrigin,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
    preview: {
      port: 4173,
      // Note: /api/tmdb-proxy is intentionally NOT listed here.
      // Our configurePreviewServer middleware intercepts it first and
      // makes authenticated calls to the Supabase edge function.
      // The http-proxy rules run before configurePreviewServer middleware,
      // so any rule here would bypass our auth-header injection.
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
    plugins: [
      devTmdbProxyPlugin(
        normalizeSecret(env.TMDB_API_KEY),
        supabaseOrigin && env.VITE_SUPABASE_ANON_KEY
          ? { origin: supabaseOrigin, anonKey: normalizeSecret(env.VITE_SUPABASE_ANON_KEY) ?? env.VITE_SUPABASE_ANON_KEY }
          : undefined,
      ),
      react(),
      cspPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(PROJECT_ROOT, "./src"),
        react: path.resolve(PROJECT_ROOT, "node_modules/react"),
        "react-dom": path.resolve(PROJECT_ROOT, "node_modules/react-dom"),
        "react-dom/client": path.resolve(
          PROJECT_ROOT,
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
      modulePreload: {
        resolveDependencies(_url, deps) {
          return deps.filter(
            (dep) =>
              !deferredModulePreloadPatterns.some((pattern) =>
                pattern.test(dep),
              ),
          );
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              /node_modules[\\/]react(?:[\\/]|$)/.test(id) ||
              /node_modules[\\/]react-dom(?:[\\/]|$)/.test(id) ||
              /node_modules[\\/]react-router-dom(?:[\\/]|$)/.test(id) ||
              /node_modules[\\/]\.vite[\\/]deps[\\/]react(?:[-.]|$)/.test(id) ||
              /node_modules[\\/]\.vite[\\/]deps[\\/]react-dom(?:[-.]|$)/.test(id) ||
              /node_modules[\\/]\.vite[\\/]deps[\\/]react-router-dom(?:[-.]|$)/.test(id)
            ) {
              return "vendor-react";
            }

            if (id.includes("node_modules/@tanstack/react-query")) {
              return "vendor-query";
            }

            if (
              id.includes("node_modules/@radix-ui/") ||
              id.includes("node_modules/react-hook-form/") ||
              id.includes("node_modules/cmdk/") ||
              id.includes("node_modules/sonner/") ||
              id.includes("node_modules/class-variance-authority/") ||
              id.includes("node_modules/clsx/") ||
              id.includes("node_modules/tailwind-merge/") ||
              id.includes("node_modules/embla-carousel")
            ) {
              return "vendor-ui";
            }

            if (id.includes("node_modules/framer-motion")) {
              return "vendor-motion";
            }

            if (id.includes("node_modules/lucide-react")) {
              return "vendor-icons";
            }

            if (
              id.includes("node_modules/i18next") ||
              id.includes("node_modules/react-i18next")
            ) {
              return "vendor-i18n";
            }

            if (id.includes("node_modules/@supabase/supabase-js")) {
              return "vendor-supabase";
            }

            if (id.includes("node_modules/recharts")) {
              return "vendor-charts";
            }

            if (
              id.includes("node_modules/mapbox-gl") ||
              id.includes("/src/components/FilmingLocationsMap.tsx") ||
              id.includes("/src/pages/LocationDetails.tsx")
            ) {
              return "location-map";
            }

            return undefined;
          },
        },
      },
    },
  };
});
