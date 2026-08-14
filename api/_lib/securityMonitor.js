import { getServerEnv, isServerProduction } from "./env.js";
import { createServerLogger } from "./logger.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";

const logger = createServerLogger("security");
const ALERT_THROTTLE_MS = 5 * 60 * 1000;
const alertState = new Map();

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

export async function reportSecurityEvent({
  event,
  severity = "warning",
  message,
  scope = "api",
  req,
  details = {},
  shouldAlert = false,
}) {
  const payload = {
    event,
    severity,
    scope,
    message,
    timestamp: new Date().toISOString(),
    method: req?.method || null,
    path: req?.url || req?.headers?.["x-vercel-id"] || null,
    ip:
      req?.headers?.["x-forwarded-for"] ||
      req?.headers?.["x-real-ip"] ||
      req?.socket?.remoteAddress ||
      null,
    details: normalizeError(details),
  };

  const logLine = JSON.stringify(payload);
  if (severity === "critical" || severity === "error") {
    logger.error(logLine);
  } else if (severity === "warning") {
    logger.warn(logLine);
  } else {
    logger.info(logLine);
  }

  if (!shouldAlert) return;

  const webhook = getServerEnv("SECURITY_ALERT_WEBHOOK_URL");
  if (!webhook || typeof fetch !== "function") return;

  const throttleKey = `${event}:${severity}`;
  const now = Date.now();
  const lastSentAt = alertState.get(throttleKey) || 0;
  if (now - lastSentAt < ALERT_THROTTLE_MS) return;

  alertState.set(throttleKey, now);

  try {
    await fetchWithTimeout(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `[${severity.toUpperCase()}] ${scope}: ${message}`,
        event: payload,
        production: isServerProduction(),
      }),
    });
  } catch (error) {
    logger.error(
      JSON.stringify({
        event: "security_alert_delivery_failed",
        severity: "error",
        scope,
        message: "Failed to deliver security alert webhook.",
        timestamp: new Date().toISOString(),
        details: normalizeError(error),
      }),
    );
  }
}

export function resetSecurityAlertsForTests() {
  alertState.clear();
}
