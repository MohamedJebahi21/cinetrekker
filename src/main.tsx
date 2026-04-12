import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./i18n";
import {
  applyThemeToDocument,
  readStoredTheme,
} from "@/contexts/ThemeContext";

// Install chunk error recovery handlers
import { installChunkErrorHandlers } from "@/lib/chunkErrorRecovery";

// Install chunk error handlers BEFORE React renders
installChunkErrorHandlers();
applyThemeToDocument(readStoredTheme());

if (typeof window !== "undefined") {
  const tt = (window as unknown as { 
    trustedTypes?: { 
      createPolicy: (name: string, rules: {
        createHTML?: (value: string) => string;
        createScript?: (value: string) => string;
        createScriptURL?: (value: string) => string;
      }) => void 
    } 
  }).trustedTypes;
  if (tt) {
    const createPolicy = (name: string) => {
      try {
        tt.createPolicy(name, {
          createHTML: (value: string) => value,
          createScript: (value: string) => value,
          createScriptURL: (value: string) => value,
        });
      } catch {
        // Reuse existing policy if already created by the browser/runtime.
      }
    };

    createPolicy("default");
    createPolicy("cinetrekker");
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

  const isVercelHost =
    typeof window !== "undefined" && /(?:^|\.)vercel\.app$/i.test(window.location.hostname);
  const shouldLoadSpeedInsights =
    import.meta.env.VITE_ENABLE_VERCEL_SPEED_INSIGHTS === "true" ||
    (import.meta.env.PROD && isVercelHost);

  if (shouldLoadSpeedInsights) {
    // Defer non-critical Speed Insights script to avoid competing with initial paint.
    const injectInsights = () => {
      import("@vercel/speed-insights")
        .then((mod) => (mod as unknown as { default: () => void }).default())
        .catch(() => undefined);
    };

    if (typeof window !== "undefined") {
      const g = window as any;
      if ("requestIdleCallback" in g) {
        g.requestIdleCallback(injectInsights, { timeout: 2500 });
      } else {
        g.requestAnimationFrame(() => {
          g.requestAnimationFrame(injectInsights);
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


