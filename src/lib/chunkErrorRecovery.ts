/**
 * Chunk Error Recovery Module
 *
 * Automatically recovers from chunk load errors that occur after deployments
 * when users have cached old versions of the app trying to load chunks that no longer exist.
 *
 * Features:
/**
 * Chunk Error Recovery Module
 *
 * Automatically recovers from chunk load errors that occur after deployments
 * when users have cached old versions of the app trying to load chunks that no longer exist.
 *
 * Features:
 * - Automatic page reload on chunk load errors
 * - Protection against infinite reload loops
 * - User-friendly notifications
 * - Manual refresh fallback after max retries
 */

interface ChunkErrorRecoveryConfig {
  maxRetries?: number;
  retryDelay?: number;
  storageKey?: string;
}

import { logger } from "@/lib/logger";

const extensionConnectionErrorRegex =
  /Could not establish connection\. Receiving end does not exist\.?/i;
let handlersInstalled = false;

function getRejectionMessage(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object" && "message" in reason) {
    const message = (reason as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  if (reason && typeof (reason as { toString?: unknown }).toString === "function") {
    return String(reason);
  }
  return "";
}

function isExtensionConnectionNoise(reason: unknown): boolean {
  const message = getRejectionMessage(reason).trim();
  if (!extensionConnectionErrorRegex.test(message)) {
    return false;
  }
  return true;
}

function isExtensionConnectionNoiseFromErrorEvent(event: ErrorEvent): boolean {
  const message = (event.message || "").trim();
  if (extensionConnectionErrorRegex.test(message)) {
    return true;
  }

  if (event.error instanceof Error) {
    return isExtensionConnectionNoise(event.error);
  }

  return false;
}

class ChunkErrorRecovery {
  private static instance: ChunkErrorRecovery;
  private retryCount: number = 0;
  private maxRetries: number;
  private retryDelay: number;
  private storageKey: string;
  private isReloading: boolean = false;

  private constructor(config: ChunkErrorRecoveryConfig = {}) {
    this.maxRetries = config.maxRetries ?? 1;
    this.retryDelay = config.retryDelay ?? 1000;
    this.storageKey = config.storageKey ?? "cinetrekker_chunk_retry_count";

    // Load retry count from sessionStorage (persists across reloads)
    const stored = sessionStorage.getItem(this.storageKey);
    this.retryCount = stored ? parseInt(stored, 10) : 0;
  }

  public static getInstance(
    config?: ChunkErrorRecoveryConfig,
  ): ChunkErrorRecovery {
    if (!ChunkErrorRecovery.instance) {
      ChunkErrorRecovery.instance = new ChunkErrorRecovery(config);
    }
    return ChunkErrorRecovery.instance;
  }

  public isChunkError(error: Error | ErrorEvent | string | unknown): boolean {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : (error as ErrorEvent)?.message || "";

    const lower = errorMessage.toLowerCase();
    return (
      lower.includes("chunkloaderror") ||
      lower.includes("loading chunk") ||
      lower.includes("failed to fetch dynamically imported module") ||
      lower.includes("importing a module script failed") ||
      lower.includes("error loading dynamically imported module") ||
      lower.includes("err_cache_read_failure") ||
      lower.includes("failed to fetch module script")
    );
  }

  public handleError(error: Error | ErrorEvent | string | unknown): boolean {
    if (!this.isChunkError(error)) {
      return false;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : (error as ErrorEvent)?.message || "";

    console.warn("🔄 Chunk load error detected:", errorMessage);

    // Prevent infinite reload loops
    if (this.retryCount >= this.maxRetries) {
      console.error(
        "❌ Max chunk reload attempts reached. Manual refresh required.",
      );
      this.showManualRefreshPrompt();
      return true;
    }

    // Prevent concurrent reloads
    if (this.isReloading) {
      return true;
    }

    // Perform reload
    this.performReload();
    return true;
  }

  public async purgeCachesAndReload(): Promise<void> {
    // NOTE: Do NOT call this.reset() here. This function is called by both:
    //   (a) performReload() — the auto-retry path, which already incremented
    //       retryCount and needs it to persist in sessionStorage so the next
    //       page load knows an auto-retry already happened.
    //   (b) The "Refresh Now" button — which calls reset() itself before
    //       calling this function, making it a controlled clean-slate reload.
    // Resetting here would break (a) and cause an infinite auto-reload loop.
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.update()));
      }
    } catch {
      // Ignore cache clearing errors
    }
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", Date.now().toString());
    window.location.replace(url.toString());
  }

  private performReload(): void {
    this.isReloading = true;
    this.retryCount++;
    sessionStorage.setItem(this.storageKey, this.retryCount.toString());

    logger.error(
      `🔄 Reloading page to fetch latest chunks (attempt ${this.retryCount}/${this.maxRetries})...`,
    );

    // Show user-friendly notification
    this.showReloadNotification();

    // Delay reload slightly to allow notification to render, then purge caches and reload
    setTimeout(() => {
      void this.purgeCachesAndReload();
    }, this.retryDelay);
  }

  private showReloadNotification(): void {
    // Try to use toast if available
    if (typeof window !== "undefined" && "toast" in window) {
      try {
        // @ts-expect-error - toast is available globally
        window.toast({
          title: "Updating...",
          description: "Loading the latest version of CineTrekker",
        });
      } catch (e) {
        // Fallback to visual notification
        this.createVisualNotification();
      }
    } else {
      this.createVisualNotification();
    }
  }

  private createVisualNotification(): void {
    // Prevent duplicate notifications
    const existing = document.getElementById("chunk-reload-notification");
    if (existing) return;

    // Build the notification using DOM APIs to avoid an innerHTML Trusted-Types
    // sink for a purely static, controlled string.
    const notification = document.createElement("div");
    notification.id = "chunk-reload-notification";

    const card = document.createElement("div");
    card.style.cssText = [
      "position:fixed",
      "top:20px",
      "right:20px",
      "z-index:99999",
      "background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
      "color:white",
      "padding:16px 24px",
      "border-radius:12px",
      "box-shadow:0 10px 40px rgba(0,0,0,0.3)",
      "font-family:system-ui,-apple-system,sans-serif",
      "font-size:14px",
      "font-weight:500",
      "animation:slideIn 0.3s ease-out",
    ].join(";");

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:12px;";

    const spinner = document.createElement("div");
    spinner.style.cssText = [
      "width:20px",
      "height:20px",
      "border:2px solid white",
      "border-top-color:transparent",
      "border-radius:50%",
      "animation:spin 0.8s linear infinite",
    ].join(";");

    const textCol = document.createElement("div");

    const heading = document.createElement("div");
    heading.style.cssText = "font-weight:600;margin-bottom:4px;";
    heading.textContent = "Updating CineTrekker";

    const sub = document.createElement("div");
    sub.style.cssText = "opacity:0.9;font-size:12px;";
    sub.textContent = "Loading the latest version...";

    textCol.appendChild(heading);
    textCol.appendChild(sub);
    row.appendChild(spinner);
    row.appendChild(textCol);
    card.appendChild(row);

    const style = document.createElement("style");
    style.textContent = [
      "@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}",
      "@keyframes spin{to{transform:rotate(360deg)}}",
    ].join("");

    notification.appendChild(card);
    notification.appendChild(style);
    document.body.appendChild(notification);
  }

  private showManualRefreshPrompt(): void {
    // Prevent duplicate prompts
    const existing = document.getElementById("chunk-error-prompt");
    if (existing) return;

    const prompt = document.createElement("div");
    prompt.id = "chunk-error-prompt";

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99998;";

    // Dialog container
    const dialog = document.createElement("div");
    dialog.style.cssText = [
      "position:fixed",
      "top:50%",
      "left:50%",
      "transform:translate(-50%,-50%)",
      "z-index:99999",
      "background:white",
      "padding:32px",
      "border-radius:16px",
      "box-shadow:0 20px 60px rgba(0,0,0,0.3)",
      "max-width:400px",
      "text-align:center",
      "font-family:system-ui,-apple-system,sans-serif",
    ].join(";");

    const icon = document.createElement("div");
    icon.style.cssText = "font-size:48px;margin-bottom:16px;";
    icon.textContent = "🔄";

    const heading = document.createElement("h2");
    heading.style.cssText =
      "font-size:20px;font-weight:600;margin-bottom:12px;color:#1a1a1a;";
    heading.textContent = "Update Required";

    const message = document.createElement("p");
    message.style.cssText = "color:#666;margin-bottom:24px;line-height:1.5;";
    message.textContent =
      "A new version of CineTrekker is available. Please refresh the page to continue.";

    const button = document.createElement("button");
    button.style.cssText = [
      "background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
      "color:white",
      "border:none",
      "padding:12px 32px",
      "border-radius:8px",
      "font-size:16px",
      "font-weight:600",
      "cursor:pointer",
      "width:100%",
      "transition:transform 0.2s",
    ].join(";");
    button.textContent = "Refresh Now";
    button.addEventListener("click", () => {
      button.disabled = true;
      button.textContent = "Refreshing…";
      // Reset counter first so the next load starts with retryCount = 0,
      // then purge stale caches and navigate with a cache-busting URL.
      this.reset();
      void this.purgeCachesAndReload();
    });
    button.addEventListener("mouseover", () => {
      button.style.transform = "scale(1.05)";
    });
    button.addEventListener("mouseout", () => {
      button.style.transform = "scale(1)";
    });

    dialog.appendChild(icon);
    dialog.appendChild(heading);
    dialog.appendChild(message);
    dialog.appendChild(button);
    prompt.appendChild(dialog);
    prompt.appendChild(backdrop);
    document.body.appendChild(prompt);
  }

  public reset(): void {
    this.retryCount = 0;
    sessionStorage.removeItem(this.storageKey);
  }
}

// Initialize and export singleton
export const chunkErrorRecovery = ChunkErrorRecovery.getInstance({
  maxRetries: 1, // Allow one automatic retry
  retryDelay: 1000, // Wait 1 second before reload
});

/**
 * Install global error handlers for chunk load errors
 * Call this once at app initialization (in main.tsx)
 */
export function installChunkErrorHandlers(): void {
  const isDev = Boolean(
    (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "development"),
  );
  const chunkDebugEnabled =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_CHUNK_ERROR_DEBUG === "true") ||
    (typeof process !== "undefined" &&
      process.env?.VITE_CHUNK_ERROR_DEBUG === "true");

  // Avoid duplicate global listeners across HMR/module reloads.
  if (handlersInstalled) {
    return;
  }
  handlersInstalled = true;

  // Vite-specific dynamic import preload failure listener
  window.addEventListener("vite:preloadError", (event) => {
    logger.warn("🔄 Vite preload error detected:", event);
    chunkErrorRecovery.handleError(
      new Error("Failed to fetch dynamically imported module"),
    );
  });

  // Handle unhandled promise rejections (common for dynamic imports)
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (isExtensionConnectionNoise(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (isDev && !chunkDebugEnabled) {
        return;
      }

      if (
        chunkErrorRecovery.handleError(
          new Error(event.reason?.message || "Unknown error"),
        )
      ) {
        event.preventDefault(); // Prevent default error logging
      }
    },
    { capture: true },
  );

  // Handle global errors
  window.addEventListener(
    "error",
    (event) => {
      if (isExtensionConnectionNoiseFromErrorEvent(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (isDev && !chunkDebugEnabled) {
        return;
      }

      if (chunkErrorRecovery.handleError(event.error || event)) {
        event.preventDefault();
      }
    },
    { capture: true },
  );

  // Reset retry count when app successfully loads
  window.addEventListener("load", () => {
    setTimeout(() => {
      chunkErrorRecovery.reset();
    }, 2000); // Reset after 2 seconds of successful load
  });

  if (isDev && chunkDebugEnabled) {
    logger.debug("Chunk error recovery handlers installed");
  }
}
