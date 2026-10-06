import { reportSecurityEvent } from "./securityMonitor.js";

const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;
const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,96}$/;
const REQUEST_ID_PROPERTY = "__cinetrekkerRequestId";
const ENDPOINT_LIMITS = {
  default: { windowMs: 60 * 1000, ipMaxRequests: 30 },
  recommend: { windowMs: 60 * 1000, ipMaxRequests: 15 },
  "tmdb-proxy": { windowMs: 60 * 1000, ipMaxRequests: 240 },
  enrichment: { windowMs: 60 * 1000, ipMaxRequests: 240 },
  feedback: { windowMs: 10 * 60 * 1000, ipMaxRequests: 3 },
  "client-errors": { windowMs: 60 * 1000, ipMaxRequests: 8 },
  follow: { windowMs: 60 * 1000, ipMaxRequests: 12, userMaxRequests: 20 },
  unfollow: { windowMs: 60 * 1000, ipMaxRequests: 12, userMaxRequests: 20 },
  "notifications-mark-read": {
    windowMs: 60 * 1000,
    ipMaxRequests: 10,
    userMaxRequests: 24,
  },
  "notifications-list": {
    windowMs: 60 * 1000,
    ipMaxRequests: 20,
    userMaxRequests: 45,
  },
  "notifications-unread-count": {
    windowMs: 60 * 1000,
    ipMaxRequests: 20,
    userMaxRequests: 45,
  },
  "user-followed": {
    windowMs: 60 * 1000,
    ipMaxRequests: 15,
    userMaxRequests: 30,
  },
};

const requestStore = new Map();
let lastCleanupAt = 0;

function getEndpointConfig(prefix) {
  return ENDPOINT_LIMITS[prefix] || ENDPOINT_LIMITS.default;
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return `ct_${globalThis.crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function ensureRequestId(req, res) {
  const existing = req?.[REQUEST_ID_PROPERTY];
  if (typeof existing === "string" && REQUEST_ID_PATTERN.test(existing)) {
    if (res?.setHeader) res.setHeader("X-Request-Id", existing);
    return existing;
  }

  const requested = req?.headers?.[REQUEST_ID_HEADER];
  const requestId =
    typeof requested === "string" && REQUEST_ID_PATTERN.test(requested)
      ? requested
      : createRequestId();

  if (req) req[REQUEST_ID_PROPERTY] = requestId;
  if (res?.setHeader) res.setHeader("X-Request-Id", requestId);
  return requestId;
}

export function getRequestId(req) {
  const requestId = req?.[REQUEST_ID_PROPERTY];
  return typeof requestId === "string" && REQUEST_ID_PATTERN.test(requestId)
    ? requestId
    : null;
}

export function getClientIP(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req?.headers?.["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp;
  }

  return req?.socket?.remoteAddress || "unknown";
}

export function isAllowedOrigin(origin, method = "GET") {
  if (!origin) {
    // Browsers omit Origin on ordinary same-origin safe requests. Keep
    // production mutations protected while allowing public read endpoints to
    // serve the page that initiated them.
    const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "GET";
    return (
      process.env.NODE_ENV !== "production" ||
      normalizedMethod === "GET" ||
      normalizedMethod === "HEAD" ||
      normalizedMethod === "OPTIONS"
    );
  }

  const allowedOrigins = new Set([
    "https://cinetrekker.vercel.app",
    "https://www.cinetrekker.vercel.app",
  ]);

  const isPreview =
    /^https:\/\/cinetrekker-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
  const isLocal =
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/localhost:(5173|5174|8080|4173)$/.test(origin);

  return allowedOrigins.has(origin) || isPreview || isLocal;
}

function cleanupRateLimitStore(now) {
  if (now - lastCleanupAt <= RATE_LIMIT_CLEANUP_MS) return;

  for (const [storeKey, entry] of requestStore.entries()) {
    if (now > entry.resetAt) {
      requestStore.delete(storeKey);
    }
  }

  lastCleanupAt = now;
}

function isRateLimitedInMemory(key, config, limit) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const entry = requestStore.get(key);
  if (!entry || now > entry.resetAt) {
    requestStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

async function applyRateLimit(req, res, prefix, key, limitKind, limit) {
  const config = getEndpointConfig(prefix);
  const limitCheck = isRateLimitedInMemory(key, config, limit);

  if (!limitCheck.limited) {
    return { ok: true };
  }

  res.setHeader("Retry-After", String(limitCheck.retryAfter));
  await reportSecurityEvent({
    event: "rate_limit_hit",
    severity: "warning",
    scope: prefix,
    message: `Rate limit exceeded for ${prefix}.`,
    req,
    details: {
      limitKind,
      retryAfter: limitCheck.retryAfter,
      key,
    },
    shouldAlert: false,
  });

  return {
    ok: false,
    status: 429,
    error: "Too many requests. Please try again later.",
  };
}

export async function enforceRequestSecurity(req, res, prefixOrOptions) {
  ensureRequestId(req, res);
  const options =
    typeof prefixOrOptions === "object" && prefixOrOptions !== null
      ? prefixOrOptions
      : {};
  const prefix =
    typeof prefixOrOptions === "string"
      ? prefixOrOptions
      : (options.rateLimitPrefix || options.prefix || "default");

  if (Array.isArray(options.allowedMethods) && options.allowedMethods.length > 0) {
    if (!options.allowedMethods.includes(req?.method)) {
      if (typeof res?.setHeader === "function") {
        res.setHeader("Allow", options.allowedMethods.join(", "));
      }
      return {
        ok: false,
        status: 405,
        error: `Method ${req?.method} not allowed.`,
      };
    }
  }

  const origin = req?.headers?.origin;
  const secFetchSite = req?.headers?.["sec-fetch-site"];
  if (secFetchSite === "same-origin") {
    // Allow same-origin navigation/subresources
  } else if (!isAllowedOrigin(origin, req?.method)) {
    await reportSecurityEvent({
      event: "forbidden_origin",
      severity: "warning",
      scope: prefix,
      message: "Request blocked due to forbidden origin.",
      req,
      details: { origin },
      shouldAlert: false,
    });
    return { ok: false, status: 403, error: "Forbidden origin" };
  }

  const config = getEndpointConfig(prefix);
  const ip = getClientIP(req);
  return applyRateLimit(req, res, prefix, `${prefix}:ip:${ip}`, "ip", config.ipMaxRequests);
}

export async function enforceAuthenticatedRequestSecurity(
  req,
  res,
  prefix,
  userId,
) {
  ensureRequestId(req, res);
  const config = getEndpointConfig(prefix);
  if (!config.userMaxRequests || !userId) {
    return { ok: true };
  }

  const ip = getClientIP(req);
  return applyRateLimit(
    req,
    res,
    prefix,
    `${prefix}:user:${userId}:ip:${ip}`,
    "user",
    config.userMaxRequests,
  );
}

export function setRateLimitDependenciesForTests() {
  // Maintained for backward compatibility with test suites
}

export function resetRequestSecurityStateForTests() {
  requestStore.clear();
  lastCleanupAt = 0;
}
