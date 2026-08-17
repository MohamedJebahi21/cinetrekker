import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { initI18n } from "./i18n";
import {
  applyThemeToDocument,
  readStoredTheme,
} from "@/contexts/ThemeContext";

// Install chunk error recovery handlers
import { installChunkErrorHandlers } from "@/lib/chunkErrorRecovery";
// Initialise Trusted Types policies (cinetrekker + default) before any React
// code runs so that all DOM sink assignments are covered from the start.
import "@/lib/trustedTypes";
import { scheduleIdleTask } from "@/lib/idleCallback";
import { createLogger } from "@/lib/logger";
import { registerCineTrekkerServiceWorker } from "@/lib/browserPush";

// Install chunk error handlers BEFORE React renders
installChunkErrorHandlers();
applyThemeToDocument(readStoredTheme());

const logger = createLogger("bootstrap");

const rootElement = document.getElementById("root");
if (!rootElement) {
  logger.error("Missing root element. Make sure index.html has <div id=\"root\"></div>");
  throw new Error("Missing root element in index.html");
}

function renderFatalError(err: unknown) {
  if (!rootElement) {
    return;
  }

  logger.error("Fatal error during React render:", err);

  const container = document.createElement("div");
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "assertive");
  container.style.cssText = [
    "min-height: 100dvh",
    "display: grid",
    "place-items: center",
    "padding: 24px",
    "font-family: var(--font-body, system-ui, sans-serif)",
    "background: hsl(var(--background, 240 9% 5%))",
    "color: hsl(var(--foreground, 48 18% 96%))",
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "width: min(100%, 620px)",
    "padding: 28px",
    "border: 1px solid hsl(var(--border, 240 5% 18%))",
    "border-radius: 20px",
    "background: hsl(var(--card, 240 6% 12%) / 0.92)",
    "box-shadow: var(--shadow-card, 0 18px 48px rgb(0 0 0 / 0.35))",
  ].join(";");

  const heading = document.createElement("h1");
  heading.style.cssText = "margin: 0; font-size: 1.5rem; line-height: 1.2; color: hsl(var(--foreground, 48 18% 96%));";
  heading.textContent = "CineTrekker could not start";

  const errorText = document.createElement("p");
  errorText.style.cssText = [
    "margin: 16px 0 0",
    "padding: 14px 16px",
    "border: 1px solid hsl(var(--destructive, 8 78% 48%) / 0.35)",
    "border-radius: 14px",
    "background: hsl(var(--destructive, 8 78% 48%) / 0.1)",
    "color: hsl(var(--foreground, 48 18% 96%))",
    "overflow-wrap: anywhere",
  ].join(";");
  errorText.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;

  const hint = document.createElement("p");
  hint.style.cssText = "margin: 14px 0 0; color: hsl(var(--muted-foreground, 240 4% 66%)); line-height: 1.55;";
  hint.textContent = "Refresh the page to try again. If the issue continues, check the browser console for details.";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Refresh page";
  retry.style.cssText = [
    "margin-top: 20px",
    "min-height: 44px",
    "border: 0",
    "border-radius: 12px",
    "padding: 0 16px",
    "font-weight: 700",
    "background: hsl(var(--primary, 356 84% 50%))",
    "color: hsl(var(--primary-foreground, 0 0% 100%))",
    "cursor: pointer",
  ].join(";");
  retry.addEventListener("click", () => window.location.reload());

  panel.append(heading, errorText, hint, retry);
  container.append(panel);
  rootElement.replaceChildren(container);
}

void initI18n()
  .then(() => {
    if (!rootElement) {
      throw new Error("Missing root element in index.html");
    }

    createRoot(rootElement).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </StrictMode>,
    );

    document.documentElement.dataset.cinetrekkerMounted = "true";
    window.dispatchEvent(new Event("cinetrekker:mounted"));

    // This only installs the background notification handler. Permission is
    // requested later from the explicit Settings action, never on page load.
    scheduleIdleTask(() => {
      void registerCineTrekkerServiceWorker().catch((error) => {
        logger.warn("Service worker registration failed", error);
      });
    }, { timeout: 3500 });

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

      scheduleIdleTask(injectInsights, { timeout: 2500 });
    }
  })
  .catch((err) => {
    renderFatalError(err);
    throw err;
  });
