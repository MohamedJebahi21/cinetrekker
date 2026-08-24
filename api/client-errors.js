import { json, parseBody } from "./_lib/http.js";
import { ensureRequestId, enforceRequestSecurity } from "./_lib/requestSecurity.js";
import { reportOperationalEvent } from "./_lib/operationalMonitor.js";

const ALLOWED_EVENTS = new Set([
  "bootstrap_failure",
  "react_boundary",
  "runtime_error",
  "unhandled_rejection",
  "chunk_load_failure",
]);
const SAFE_TOKEN = /^[a-z0-9._:-]{1,96}$/i;

function safeToken(value, fallback = "unknown") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return SAFE_TOKEN.test(normalized) ? normalized : fallback;
}

export default async function handler(req, res) {
  ensureRequestId(req, res);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "client-errors");
  if (!security.ok) {
    return json(res, security.status, { error: security.error });
  }

  const body = parseBody(req);
  const event = safeToken(body.event);
  if (!ALLOWED_EVENTS.has(event)) {
    return json(res, 400, { error: "Invalid client incident event." });
  }

  const route = safeToken(body.route, "unknown");
  const fingerprint = safeToken(body.fingerprint, "unknown");
  const release = safeToken(body.release, "unknown");

  await reportOperationalEvent({
    event: "client_incident",
    severity: "error",
    scope: "client",
    message: "A privacy-safe client incident was reported.",
    req,
    details: {
      clientEvent: event,
      route,
      fingerprint,
      release,
    },
    shouldAlert: false,
  });

  return json(res, 202, {
    accepted: true,
    requestId: req.__cinetrekkerRequestId,
  });
}
