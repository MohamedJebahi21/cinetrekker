import { getServerEnv, isServerProduction } from "./env.js";
import { createServerLogger } from "./logger.js";

const logger = createServerLogger("operations");
const ALERT_THROTTLE_MS = 5 * 60 * 1000;
const alertState = new Map();

function normalizeDetails(details) {
  if (!details || typeof details !== "object") return {};

  const output = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "string") {
      output[key] = value.slice(0, 500);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      output[key] = value;
    }
  }

  return output;
}

function getAlertWebhook() {
  return (
    getServerEnv("OPERATIONAL_ALERT_WEBHOOK_URL") ||
    getServerEnv("SECURITY_ALERT_WEBHOOK_URL")
  );
}

/**
 * Emits an intentionally small, structured operational event. This is not an
 * analytics channel: callers must not pass identifiers, free-form user input,
 * titles, search terms, credentials, or raw stack traces.
 */
export async function reportOperationalEvent({
  event,
  severity = "error",
  message,
  scope = "api",
  req,
  details = {},
  shouldAlert = severity === "critical",
}) {
  const payload = {
    event,
    severity,
    scope,
    message,
    timestamp: new Date().toISOString(),
    requestId:
      typeof req?.__cinetrekkerRequestId === "string"
        ? req.__cinetrekkerRequestId
        : null,
    method: req?.method || null,
    path: typeof req?.url === "string" ? req.url.split("?")[0] : null,
    details: normalizeDetails(details),
  };

  const line = JSON.stringify(payload);
  if (severity === "critical" || severity === "error") {
    logger.error(line);
  } else if (severity === "warning") {
    logger.warn(line);
  } else {
    logger.info(line);
  }

  if (!shouldAlert) return;

  const webhook = getAlertWebhook();
  if (!webhook || typeof fetch !== "function") return;

  const throttleKey = `${event}:${severity}:${scope}`;
  const now = Date.now();
  const lastSentAt = alertState.get(throttleKey) || 0;
  if (now - lastSentAt < ALERT_THROTTLE_MS) return;
  alertState.set(throttleKey, now);

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[${severity.toUpperCase()}] ${scope}: ${message}`,
        event: payload,
        production: isServerProduction(),
      }),
    });
  } catch (error) {
    logger.error(
      JSON.stringify({
        event: "operational_alert_delivery_failed",
        severity: "error",
        scope,
        message: "Failed to deliver operational alert webhook.",
        timestamp: new Date().toISOString(),
        details: {
          error:
            error instanceof Error ? error.message.slice(0, 240) : "unknown",
        },
      }),
    );
  }
}

export function resetOperationalAlertsForTests() {
  alertState.clear();
}
