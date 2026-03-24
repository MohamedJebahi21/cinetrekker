const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;
const DEFAULT_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 30,
};
const STATE_CHANGING_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 12,
};
const STRICT_STATE_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 8,
};
const FEEDBACK_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
};
const STATE_CHANGING_PREFIXES = new Set([
  "follow",
  "unfollow",
  "notifications",
  "notifications-mark-read",
]);

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

function getRateLimitConfig(prefix) {
  if (prefix === "feedback") {
    return FEEDBACK_RATE_LIMIT;
  }

  if (prefix === "notifications-mark-read") {
    return STRICT_STATE_RATE_LIMIT;
  }

  if (STATE_CHANGING_PREFIXES.has(prefix)) {
    return STATE_CHANGING_RATE_LIMIT;
  }

  return DEFAULT_RATE_LIMIT;
}

async function getAuthenticatedUserId(req) {
  const authHeader = req?.headers?.authorization;
  const tokenMatch =
    typeof authHeader === "string"
      ? authHeader.match(/^Bearer\s+(.+)$/i)
      : null;
  const accessToken = tokenMatch?.[1]?.trim();

  if (!accessToken) {
    return null;
  }

  try {
    const { getSupabaseAdminClient } = await import("./supabaseAdmin.js");
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user?.id) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

async function getRateLimitKey(req, prefix) {
  const ip = getClientIP(req);
  const userId = await getAuthenticatedUserId(req);
  if (userId) {
    return `${prefix}:user:${userId}:ip:${ip}`;
  }
  return `${prefix}:ip:${ip}`;
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

function isRateLimitedInMemory(key, config) {
  const now = Date.now();

  if (now - lastCleanupAt > RATE_LIMIT_CLEANUP_MS) {
    for (const [storeKey, entry] of requestStore.entries()) {
      if (now > entry.resetAt) {
        requestStore.delete(storeKey);
      }
    }
    lastCleanupAt = now;
  }

  const entry = requestStore.get(key);
  if (!entry || now > entry.resetAt) {
    requestStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

async function isRateLimitedDistributed(key, config) {
  if (typeof fetch !== "function") {
    return isRateLimitedInMemory(key, config);
  }

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return isRateLimitedInMemory(key, config);
  }

  try {
    const windowSeconds = Math.ceil(config.windowMs / 1000);
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
      return isRateLimitedInMemory(key, config);
    }

    const payload = await response.json();
    const result = Array.isArray(payload?.result) ? payload.result : [];
    const count = Number(result?.[0]?.result ?? 0);
    const ttl = Number(result?.[2]?.result ?? windowSeconds);
    const retryAfter = ttl > 0 ? ttl : windowSeconds;

    return {
      limited: count > config.maxRequests,
      retryAfter,
    };
  } catch {
    return isRateLimitedInMemory(key, config);
  }
}

export async function enforceRequestSecurity(req, res, prefix) {
  const origin = req?.headers?.origin;
  if (!isAllowedOrigin(origin)) {
    return { ok: false, status: 403, error: "Forbidden origin" };
  }

  const config = getRateLimitConfig(prefix);
  const key = await getRateLimitKey(req, prefix);
  const limitCheck = await isRateLimitedDistributed(key, config);

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
