const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;

const requestStore = new Map();
const fetch = globalThis.fetch;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
let lastCleanupAt = 0;

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

export function getClientIdentifier(req) {
  const ip = getClientIP(req);
  const userAgent =
    typeof req?.headers?.["user-agent"] === "string"
      ? req.headers["user-agent"]
      : "unknown-agent";

  return `${ip}:${userAgent.slice(0, 120)}`;
}

export function isAllowedOrigin(origin) {
  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  const allowedOrigins = new Set([
    "https://cinetrekker.vercel.app",
    "https://www.cinetrekker.vercel.app",
  ]);

  const isPreview = /^https:\/\/cinetrekker-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
  const isLocal =
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/localhost:(5173|5174|8080|4173)$/.test(origin);

  return allowedOrigins.has(origin) || isPreview || isLocal;
}

function isRateLimitedInMemory(key) {
  const now = Date.now();

  if (now - lastCleanupAt > RATE_LIMIT_CLEANUP_MS) {
    for (const [storeKey, entry] of requestStore.entries()) {
      if (now > entry.resetAt + RATE_LIMIT_WINDOW_MS) {
        requestStore.delete(storeKey);
      }
    }
    lastCleanupAt = now;
  }

  const entry = requestStore.get(key);
  if (!entry || now > entry.resetAt) {
    requestStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

async function isRateLimitedDistributed(key) {
  if (typeof fetch !== "function") {
    return isRateLimitedInMemory(key);
  }

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return isRateLimitedInMemory(key);
  }

  try {
    const windowSeconds = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
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
      return isRateLimitedInMemory(key);
    }

    const payload = await response.json();
    const result = Array.isArray(payload?.result) ? payload.result : [];
    const count = Number(result?.[0]?.result ?? 0);
    const ttl = Number(result?.[2]?.result ?? windowSeconds);
    const retryAfter = ttl > 0 ? ttl : windowSeconds;

    return {
      limited: count > MAX_REQUESTS_PER_WINDOW,
      retryAfter,
    };
  } catch {
    return isRateLimitedInMemory(key);
  }
}

export async function enforceRequestSecurity(req, res, prefix) {
  const origin = req?.headers?.origin;
  if (!isAllowedOrigin(origin)) {
    return { ok: false, status: 403, error: "Forbidden origin" };
  }

  const clientKey = getClientIdentifier(req);
  const limitCheck = await isRateLimitedDistributed(`${prefix}:${clientKey}`);

  if (limitCheck.limited) {
    res.setHeader("Retry-After", String(limitCheck.retryAfter));
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please try again later.",
    };
  }

  return { ok: true };
}
