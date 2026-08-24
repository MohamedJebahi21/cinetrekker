import { json } from "./_lib/http.js";
import { getServerEnv, getMissingServerEnv } from "./_lib/env.js";
import { ensureRequestId } from "./_lib/requestSecurity.js";
import { reportOperationalEvent } from "./_lib/operationalMonitor.js";

const REQUIRED_DEPENDENCIES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TMDB_API_KEY",
  "CRON_SECRET",
];

function isRateLimitConfigured() {
  const redisUrl =
    getServerEnv("UPSTASH_REDIS_REST_KV_REST_API_URL") ||
    getServerEnv("UPSTASH_REDIS_REST_URL");
  const redisToken =
    getServerEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN") ||
    getServerEnv("UPSTASH_REDIS_REST_TOKEN");

  return Boolean(redisUrl && redisToken);
}

function buildDependencies() {
  const missing = new Set(getMissingServerEnv(REQUIRED_DEPENDENCIES));
  return {
    database: !missing.has("SUPABASE_URL") && !missing.has("SUPABASE_SERVICE_ROLE_KEY"),
    contentProvider: !missing.has("TMDB_API_KEY"),
    scheduledJobs: !missing.has("CRON_SECRET"),
    rateLimiting: isRateLimitConfigured(),
  };
}

export default async function handler(req, res) {
  ensureRequestId(req, res);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const dependencies = buildDependencies();
  const ready = Object.values(dependencies).every(Boolean);
  const payload = {
    status: ready ? "ok" : "degraded",
    service: "cinetrekker-api",
    checkedAt: new Date().toISOString(),
    requestId: req.__cinetrekkerRequestId,
    dependencies,
  };

  if (!ready) {
    await reportOperationalEvent({
      event: "health_degraded",
      severity: "warning",
      scope: "health",
      message: "One or more required runtime dependencies are not configured.",
      req,
      details: dependencies,
      shouldAlert: false,
    });
  }

  return json(res, ready ? 200 : 503, payload);
}
