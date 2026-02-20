import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { SpeedInsightsWrapper } from '@/components/SpeedInsightsWrapper';
import "./index.css";
import "./i18n";

// Install chunk error recovery handlers
import { installChunkErrorHandlers } from '@/lib/chunkErrorRecovery';

// Install chunk error handlers BEFORE React renders
installChunkErrorHandlers();

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ CRITICAL: Root element not found! Make sure index.html has <div id=\"root\"></div>");
  throw new Error("Root element not found in index.html");
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SpeedInsightsWrapper />
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
} catch (err) {
  console.error("❌ FATAL ERROR during React render:", err);

  const container = document.createElement('div');
  container.style.cssText = 'padding: 40px; font-family: system-ui; max-width: 600px; margin: 0 auto;';

  const heading = document.createElement('h1');
  heading.style.color = '#dc2626';
  heading.textContent = '❌ Application Failed to Load';

  const errorText = document.createElement('p');
  errorText.style.cssText = 'background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;';
  errorText.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;

  const hint = document.createElement('p');
  hint.textContent = 'Check the browser console (F12) for more details.';

  container.append(heading, errorText, hint);
  rootElement.replaceChildren(container);
  throw err;
}