type ClientIncidentEvent =
  | "bootstrap_failure"
  | "react_boundary"
  | "runtime_error"
  | "unhandled_rejection"
  | "chunk_load_failure";

const incidentKeys = new Set<string>();
const SAFE_TOKEN = /^[a-z0-9._:-]{1,96}$/i;

function safeToken(value: unknown, fallback = "unknown") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return SAFE_TOKEN.test(normalized) ? normalized : fallback;
}

function routeGroup(pathname = window.location.pathname) {
  const [first] = pathname.split("/").filter(Boolean);
  return safeToken(first || "home", "other");
}

function errorFingerprint(error: unknown) {
  if (error instanceof Error) {
    return safeToken(error.name, "error");
  }
  return "non_error_rejection";
}

/**
 * Sends deliberately minimal operational data. Do not add user identifiers,
 * raw errors, stack traces, URLs with identifiers, titles, search text, or
 * other user content to this payload.
 */
export function reportClientIncident(
  event: ClientIncidentEvent,
  error: unknown,
  options: { route?: string; release?: string } = {},
) {
  if (
    typeof window === "undefined" ||
    navigator.onLine === false ||
    typeof fetch !== "function"
  ) {
    return;
  }

  const payload = {
    event,
    route: safeToken(options.route || routeGroup(), "other"),
    fingerprint: errorFingerprint(error),
    release: safeToken(options.release || import.meta.env.VITE_RELEASE_ID, "unknown"),
  };
  const dedupeKey = `${payload.event}:${payload.route}:${payload.fingerprint}:${payload.release}`;
  if (incidentKeys.has(dedupeKey)) return;
  incidentKeys.add(dedupeKey);

  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}

export function installClientIncidentReporting() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    if (!event.error) return;
    reportClientIncident("runtime_error", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportClientIncident("unhandled_rejection", event.reason);
  });
}
