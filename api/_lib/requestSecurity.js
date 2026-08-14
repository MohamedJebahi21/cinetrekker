import { reportSecurityEvent } from "./securityMonitor.js";

const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;
const ENDPOINT_LIMITS = {
  default: { windowMs: 60 * 1000, ipMaxRequests: 30 },
  recommend: { windowMs: 60 * 1000, ipMaxRequests: 15 },
  feedback: { windowMs: 10 * 60 * 1000, ipMaxRequests: 3 },
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
const runtimeFetch = globalThis.fetch;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
let lastCleanupAt = 0;

function getEndpointConfig(prefix) {
  return ENDPOINT_LIMITS[prefix] || ENDPOINT_LIMITS.default;
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

export function isAllowedOrigin(origin) {
  if (!origin) {
    return process.env.NODE_ENV !== "production";
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

async function isRateLimitedDistributed(key, config, limit) {
  if (typeof runtimeFetch !== "function") {
    return isRateLimitedInMemory(key, config, limit);
  }

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return isRateLimitedInMemory(key, config, limit);
  }

  try {
    const windowSeconds = Math.ceil(config.windowMs / 1000);
    const response = await runtimeFetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds, "NX"],
        ["TTL", key],
      ]),
    });

    if (!response.ok) {
      return isRateLimitedInMemory(key, config, limit);
    }

    const payload = await response.json();
    const result = Array.isArray(payload?.result) ? payload.result : [];
    const count = Number(result?.[0]?.result ?? 0);
    const ttl = Number(result?.[2]?.result ?? windowSeconds);

    return {
      limited: count > limit,
      retryAfter: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    return isRateLimitedInMemory(key, config, limit);
  }
}

async function applyRateLimit(req, res, prefix, key, limitKind, limit) {
  const config = getEndpointConfig(prefix);
  const limitCheck = await isRateLimitedDistributed(key, config, limit);

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

export async function enforceRequestSecurity(req, res, prefix) {
  const origin = req?.headers?.origin;
  if (!isAllowedOrigin(origin)) {
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

export function resetRequestSecurityStateForTests() {
  requestStore.clear();
  lastCleanupAt = 0;
}
