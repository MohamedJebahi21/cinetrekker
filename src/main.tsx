import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import {
  applyThemeToDocument,
  readStoredTheme,
} from "@/contexts/ThemeContext";
import { sanitizeHTML } from "@/lib/sanitize";

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
};

// Install chunk error recovery handlers
import { installChunkErrorHandlers } from "@/lib/chunkErrorRecovery";

// Install chunk error handlers BEFORE React renders
installChunkErrorHandlers();
applyThemeToDocument(readStoredTheme());

if (typeof window !== "undefined") {
  try {
    const tt = window.trustedTypes;
    if (tt) {
      const createSafeJsonScript = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          throw new TypeError("Trusted Types: only JSON script payloads are allowed.");
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          throw new TypeError("Trusted Types: invalid JSON script payload.");
        }

        return JSON.stringify(parsed).replace(/</g, "\\u003c");
      };

      const denyScriptSink = (_value: string): never => {
        throw new TypeError("Trusted Types: script sinks are not allowed.");
      };

      const createSafeScriptUrl = (value: string): string => {
        if (import.meta.env.DEV) {
          return value;
        }
        throw new TypeError("Trusted Types: script URL sinks are not allowed.");
      };

      const createPolicy = (
        name: string,
        options: {
          createHTML?: (value: string) => string;
          createScript?: (value: string) => string;
          createScriptURL?: (value: string) => string;
        },
      ) => {
        try {
          tt.createPolicy(name, options);
        } catch {
          // Reuse existing policy if already created by the browser/runtime.
        }
      };

      createPolicy("default", {
        createHTML: (value: string) => sanitizeHTML(value),
        createScript: createSafeJsonScript,
        createScriptURL: createSafeScriptUrl,
      });
      createPolicy("cinetrekker", {
        createHTML: (value: string) => sanitizeHTML(value),
        createScript: createSafeJsonScript,
        createScriptURL: createSafeScriptUrl,
      });
    }
  } catch (error) {
    console.warn("Trusted Types initialization failed; continuing app bootstrap.", error);
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("CRITICAL: Missing root element! Make sure index.html has <div id=\"root\"></div>");
  throw new Error("Missing root element in index.html");
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );

  const shouldLoadSpeedInsights =
    import.meta.env.PROD ||
    import.meta.env.VITE_ENABLE_VERCEL_SPEED_INSIGHTS === "true";

  if (shouldLoadSpeedInsights) {
    // Defer non-critical Speed Insights script to avoid competing with initial paint.
    const injectInsights = () => {
      import("@vercel/speed-insights")
        .then((mod) => mod.injectSpeedInsights())
        .catch(() => undefined);
    };

    if (typeof window !== "undefined") {
      const win = window as IdleCallbackWindow;
      if (typeof win.requestIdleCallback === "function") {
        win.requestIdleCallback(injectInsights, { timeout: 2500 });
      } else {
        win.requestAnimationFrame(() => {
          win.requestAnimationFrame(injectInsights);
        });
      }
    }
  }
} catch (err) {
  console.error("FATAL ERROR during React render:", err);

  const container = document.createElement('div');
  container.style.cssText = 'padding: 40px; font-family: system-ui; max-width: 600px; margin: 0 auto;';

  const heading = document.createElement('h1');
  heading.style.color = '#dc2626';
  heading.textContent = 'Application Failed to Load';

  const errorText = document.createElement('p');
  errorText.style.cssText = 'background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;';
  errorText.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;

  const hint = document.createElement('p');
  hint.textContent = 'Check the browser console (F12) for more details.';

  container.append(heading, errorText, hint);
  rootElement.replaceChildren(container);
  throw err;
}


