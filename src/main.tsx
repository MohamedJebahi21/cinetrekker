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

// Diagnostic logging for browser console
console.log("🚀 Main.tsx is loading...");
console.log("Root element check:", document.getElementById("root"));

// Install chunk error handlers BEFORE React renders
installChunkErrorHandlers();

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ CRITICAL: Root element not found! Make sure index.html has <div id=\"root\"></div>");
  throw new Error("Root element not found in index.html");
}

console.log("✅ Root element found, initializing React application...");

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
  console.log("✅ React application mounted successfully");
} catch (err) {
  console.error("❌ FATAL ERROR during React render:", err);
  rootElement.innerHTML = `
    <div style="padding: 40px; font-family: system-ui; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #dc2626;">❌ Application Failed to Load</h1>
      <p style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
        <strong>Error:</strong> ${err instanceof Error ? err.message : String(err)}
      </p>
      <p>Check the browser console (F12) for more details.</p>
    </div>
  `;
  throw err;
}