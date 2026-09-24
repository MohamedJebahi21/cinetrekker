import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import followHandler from "../api/follow.ts";
import feedbackHandler from "../api/feedback.js";
import notificationsHandler from "../api/notifications.js";
import tmdbProxyHandler from "../api/tmdb-proxy.js";
import cronHandler from "../api/jobs/check-followed-updates.js";
import healthHandler from "../api/health.js";
import clientErrorsHandler from "../api/client-errors.js";
import {
  ensureRequestId,
  isAllowedOrigin,
  resetRequestSecurityStateForTests,
  setRateLimitDependenciesForTests,
} from "../api/_lib/requestSecurity.js";
import {
  resetAuthUserResolverForTests,
  setAuthUserResolverForTests,
} from "../api/_lib/supabaseAdmin.js";
import { resetSecurityAlertsForTests } from "../api/_lib/securityMonitor.js";
import { resetOperationalAlertsForTests } from "../api/_lib/operationalMonitor.js";

function createMockReq({
  method = "GET",
  headers = {},
  body = undefined,
  query = {},
  url = "/api/test",
  socket = { remoteAddress: "127.0.0.1" },
} = {}) {
  return {
    method,
    headers,
    body,
    query,
    url,
    socket,
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

beforeEach(() => {
  resetRequestSecurityStateForTests();
  resetAuthUserResolverForTests();
  resetSecurityAlertsForTests();
  resetOperationalAlertsForTests();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.RECAPTCHA_SECRET_KEY;
  delete process.env.VITE_TURNSTILE_SITE_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.FEEDBACK_TO_EMAIL;
});

afterEach(() => {
  resetRequestSecurityStateForTests();
  resetAuthUserResolverForTests();
  resetSecurityAlertsForTests();
  resetOperationalAlertsForTests();
});

test("rejects unauthorized user_id mismatch", async () => {
  setAuthUserResolverForTests(async () => ({
    data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
    error: null,
  }));

  const req = createMockReq({
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      origin: "http://localhost:8080",
    },
    body: {
      user_id: "22222222-2222-4222-8222-222222222222",
      movie_id: "movie-42",
    },
    url: "/api/follow",
  });
  const res = createMockRes();

  await followHandler(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /user_id does not match/i);
});

test("invalid token flooding is blocked by pre-auth rate limiting before extra auth lookups", async () => {
  let authCalls = 0;
  setAuthUserResolverForTests(async () => {
    authCalls += 1;
    return {
      data: { user: null },
      error: { message: "invalid token" },
    };
  });

  let lastStatus = 0;
  for (let index = 0; index < 13; index += 1) {
    const req = createMockReq({
      method: "POST",
      headers: {
        authorization: "Bearer bad-token",
        origin: "http://localhost:8080",
        "x-forwarded-for": "203.0.113.10",
      },
      body: {
        user_id: "11111111-1111-4111-8111-111111111111",
        movie_id: "movie-42",
      },
      url: "/api/follow",
    });
    const res = createMockRes();
    await followHandler(req, res);
    lastStatus = res.statusCode;
  }

  assert.equal(lastStatus, 429);
  assert.equal(authCalls, 12);
});

test("cron auth bypass attempts fail without x-cron-secret even when authorization header is present", async () => {
  process.env.CRON_SECRET = "real-cron-secret";
  const req = createMockReq({
    method: "POST",
    headers: {
      authorization: "Bearer real-cron-secret",
    },
    url: "/api/jobs/check-followed-updates",
  });
  const res = createMockRes();

  await cronHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Unauthorized");
});

test("production permits origin-less safe reads but rejects origin-less writes", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = "production";
    assert.equal(isAllowedOrigin(undefined, "GET"), true);
    assert.equal(isAllowedOrigin(undefined, "HEAD"), true);
    assert.equal(isAllowedOrigin(undefined, "OPTIONS"), true);
    assert.equal(isAllowedOrigin(undefined, "POST"), false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("production blocks protected requests when distributed rate limiting is unavailable", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercelEnv = process.env.VERCEL_ENV;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    setRateLimitDependenciesForTests({ url: "", token: "" });

    const req = createMockReq({
      method: "GET",
      headers: { origin: "https://cinetrekker.vercel.app" },
      query: { endpoint: "/movie/1" },
      url: "/api/tmdb-proxy",
    });
    const res = createMockRes();

    await tmdbProxyHandler(req, res);

    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /protection is temporarily unavailable/i);
    assert.equal(res.headers["Retry-After"], "60");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
});

test("managed Upstash REST aliases take precedence over stale legacy credentials", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTmdbKey = process.env.TMDB_API_KEY;
  const previousManagedUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const previousManagedToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  const previousLegacyUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousLegacyToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = global.fetch;
  const requests = [];

  try {
    process.env.NODE_ENV = "test";
    process.env.TMDB_API_KEY = "test-tmdb-key";
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL = "https://managed-redis.test";
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = "managed-token";
    process.env.UPSTASH_REDIS_REST_URL = "https://stale-redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "stale-token";

    const fetchStub = async (url, options = {}) => {
      requests.push({ url: String(url), authorization: options.headers?.Authorization });
      if (String(url).endsWith("/pipeline")) {
        return {
          ok: true,
          async json() {
            return { result: [{ result: 1 }, { result: 1 }, { result: 60 }] };
          },
        };
      }
      return {
        ok: true,
        async json() {
          return { results: [] };
        },
      };
    };
    global.fetch = fetchStub;
    setRateLimitDependenciesForTests({ fetch: fetchStub });

    const req = createMockReq({
      method: "GET",
      headers: { origin: "http://localhost:8080" },
      query: { endpoint: "/movie/1" },
      url: "/api/tmdb-proxy",
    });
    const res = createMockRes();

    await tmdbProxyHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(requests[0], {
      url: "https://managed-redis.test/pipeline",
      authorization: "Bearer managed-token",
    });
  } finally {
    const restore = (key, value) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("NODE_ENV", previousNodeEnv);
    restore("TMDB_API_KEY", previousTmdbKey);
    restore("UPSTASH_REDIS_REST_KV_REST_API_URL", previousManagedUrl);
    restore("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", previousManagedToken);
    restore("UPSTASH_REDIS_REST_URL", previousLegacyUrl);
    restore("UPSTASH_REDIS_REST_TOKEN", previousLegacyToken);
    global.fetch = originalFetch;
  }
});

test("TMDB proxy rejects an exhausted distributed request budget", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTmdbKey = process.env.TMDB_API_KEY;
  const fetchStub = async () => ({
    ok: true,
    async json() {
      return {
        result: [{ result: 61 }, { result: 1 }, { result: 60 }],
      };
    },
  });

  try {
    process.env.NODE_ENV = "test";
    process.env.TMDB_API_KEY = "test-tmdb-key";
    setRateLimitDependenciesForTests({
      fetch: fetchStub,
      url: "https://redis.test",
      token: "redis-token",
    });

    const req = createMockReq({
      method: "GET",
      headers: { origin: "http://localhost:8080" },
      query: { endpoint: "/movie/1" },
      url: "/api/tmdb-proxy",
    });
    const res = createMockRes();

    await tmdbProxyHandler(req, res);

    assert.equal(res.statusCode, 429);
    assert.match(res.body.error, /too many requests/i);
    assert.equal(res.headers["Retry-After"], "60");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousTmdbKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousTmdbKey;
  }
});

test("TMDB proxy consults rate limiting and does not expose upstream diagnostics", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTmdbKey = process.env.TMDB_API_KEY;
  const originalFetch = global.fetch;
  const requests = [];

  const fetchStub = async (url) => {
    requests.push(String(url));
    if (String(url).startsWith("https://redis.test/pipeline")) {
      return {
        ok: true,
        async json() {
          return {
            result: [{ result: 1 }, { result: 1 }, { result: 60 }],
          };
        },
      };
    }

    return {
      ok: false,
      status: 500,
      async text() {
        return "internal upstream diagnostic";
      },
    };
  };

  try {
    process.env.NODE_ENV = "test";
    process.env.TMDB_API_KEY = "test-tmdb-key";
    global.fetch = fetchStub;
    setRateLimitDependenciesForTests({
      fetch: fetchStub,
      url: "https://redis.test",
      token: "redis-token",
    });

    const req = createMockReq({
      method: "GET",
      headers: { origin: "http://localhost:8080" },
      query: { endpoint: "/movie/1" },
      url: "/api/tmdb-proxy",
    });
    const res = createMockRes();

    await tmdbProxyHandler(req, res);

    assert.equal(res.statusCode, 502);
    assert.equal(res.body.error, "Content data is temporarily unavailable.");
    assert.equal(Object.hasOwn(res.body, "details"), false);
    assert.equal(requests.some((url) => url.startsWith("https://redis.test/pipeline")), true);
  } finally {
    global.fetch = originalFetch;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousTmdbKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousTmdbKey;
  }
});

test("consolidated notification actions preserve their route-specific HTTP methods", async () => {
  const cases = [
    { action: "list", method: "POST" },
    { action: "unread-count", method: "POST" },
    { action: "mark-read", method: "GET" },
  ];

  for (const { action, method } of cases) {
    const req = createMockReq({
      method,
      query: { action },
      url: `/api/notifications?action=${action}`,
    });
    const res = createMockRes();

    await notificationsHandler(req, res);

    assert.equal(res.statusCode, 405, `${action} should reject ${method}`);
    assert.deepEqual(res.body, { error: "Method Not Allowed" });
  }
});

test("feedback availability accepts the legacy public Turnstile key name", async () => {
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "public-turnstile-site-key";
  process.env.TURNSTILE_SECRET_KEY = "turnstile-secret";
  process.env.RESEND_API_KEY = "resend-secret";
  process.env.FEEDBACK_TO_EMAIL = "alerts@example.com";

  const req = createMockReq({ method: "GET", url: "/api/feedback" });
  const res = createMockRes();

  await feedbackHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    available: true,
    captchaProvider: "turnstile",
    captchaSiteKey: "public-turnstile-site-key",
  });
});

test("feedback spam scenarios are blocked by honeypot and rate limit", async () => {
  process.env.TURNSTILE_SECRET_KEY = "turnstile-secret";
  process.env.RESEND_API_KEY = "resend-secret";
  process.env.FEEDBACK_TO_EMAIL = "alerts@example.com";

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("turnstile")) {
      return {
        ok: true,
        async json() {
          return { success: true };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return { id: "email-1" };
      },
    };
  };

  try {
    const honeypotReq = createMockReq({
      method: "POST",
      headers: {
        origin: "http://localhost:8080",
        "x-forwarded-for": "198.51.100.23",
      },
      body: {
        name: "Spam Bot",
        email: "bot@example.com",
        message: "spam",
        captchaToken: "token-1",
        website: "filled",
      },
      url: "/api/feedback",
    });
    const honeypotRes = createMockRes();
    await feedbackHandler(honeypotReq, honeypotRes);
    assert.equal(honeypotRes.statusCode, 400);

    let lastStatus = 0;
    for (let index = 0; index < 4; index += 1) {
      const req = createMockReq({
        method: "POST",
        headers: {
          origin: "http://localhost:8080",
          "x-forwarded-for": "198.51.100.55",
        },
        body: {
          name: "Alice",
          email: "alice@example.com",
          message: `Hello ${index}`,
          captchaToken: "token-1",
          website: "",
        },
        url: "/api/feedback",
      });
      const res = createMockRes();
      await feedbackHandler(req, res);
      lastStatus = res.statusCode;
    }

    assert.equal(lastStatus, 429);
  } finally {
    global.fetch = originalFetch;
  }
});


test("request identifiers preserve validated support references and replace malformed input", async () => {
  const suppliedReq = createMockReq({
    headers: { "x-request-id": "support_case_2026" },
  });
  const suppliedRes = createMockRes();

  assert.equal(ensureRequestId(suppliedReq, suppliedRes), "support_case_2026");
  assert.equal(suppliedRes.headers["X-Request-Id"], "support_case_2026");
  assert.equal(ensureRequestId(suppliedReq, suppliedRes), "support_case_2026");

  const malformedReq = createMockReq({
    headers: { "x-request-id": "not valid / unsafe" },
  });
  const malformedRes = createMockRes();
  const generatedId = ensureRequestId(malformedReq, malformedRes);

  assert.match(generatedId, /^ct_[a-z0-9_]+$/i);
  assert.equal(malformedRes.headers["X-Request-Id"], generatedId);
});

test("TMDB proxy includes the safe request identifier on early validation failures", async () => {
  const req = createMockReq({
    method: "POST",
    headers: { "x-request-id": "proxy_validation_2026" },
    url: "/api/tmdb-proxy",
  });
  const res = createMockRes();

  await tmdbProxyHandler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers["X-Request-Id"], "proxy_validation_2026");
  assert.equal(res.headers.Allow, "GET");
});


test("health endpoint reports only coarse dependency readiness and never configuration values", async () => {
  const snapshot = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    UPSTASH_REDIS_REST_KV_REST_API_URL:
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    UPSTASH_REDIS_REST_KV_REST_API_TOKEN:
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  };

  try {
    process.env.SUPABASE_URL = "https://project.supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.TMDB_API_KEY = "tmdb-secret";
    process.env.CRON_SECRET = "cron-secret";
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = "redis-secret";

    const req = createMockReq({
      method: "GET",
      headers: { "x-request-id": "health_check_2026" },
      url: "/api/health",
    });
    const res = createMockRes();

    await healthHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "ok");
    assert.deepEqual(res.body.dependencies, {
      database: true,
      contentProvider: true,
      scheduledJobs: true,
      rateLimiting: true,
    });
    assert.equal(res.body.requestId, "health_check_2026");
    assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
    assert.equal(JSON.stringify(res.body).includes("secret"), false);
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("health endpoint is cache-safe and reports degraded status without secret names", async () => {
  const snapshot = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    UPSTASH_REDIS_REST_KV_REST_API_URL:
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    UPSTASH_REDIS_REST_KV_REST_API_TOKEN:
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  };

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.TMDB_API_KEY;
    delete process.env.CRON_SECRET;
    delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
    delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

    const req = createMockReq({ method: "GET", url: "/api/health" });
    const res = createMockRes();
    await healthHandler(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, "degraded");
    assert.equal(res.body.dependencies.scheduledJobs, false);
    assert.equal(res.body.dependencies.rateLimiting, false);
    assert.equal(JSON.stringify(res.body).includes("SUPABASE"), false);
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("client incident endpoint accepts only coarse, allowed telemetry", async () => {
  const req = createMockReq({
    method: "POST",
    headers: {
      origin: "http://localhost:8080",
      "x-request-id": "client_incident_2026",
    },
    body: {
      event: "react_boundary",
      route: "profile",
      fingerprint: "typeerror",
      release: "release_2026_08",
      stack: "user@example.com should never be sent",
    },
    url: "/api/client-errors",
  });
  const res = createMockRes();

  await clientErrorsHandler(req, res);

  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, {
    accepted: true,
    requestId: "client_incident_2026",
  });
});

test("client incident endpoint rejects raw or malformed event payloads", async () => {
  const req = createMockReq({
    method: "POST",
    headers: { origin: "http://localhost:8080" },
    body: {
      event: "unexpected_server_error",
      route: "/user/01234567-89ab-cdef-0123-456789abcdef",
      fingerprint: "message with unsafe whitespace",
    },
    url: "/api/client-errors",
  });
  const res = createMockRes();

  await clientErrorsHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /invalid client incident event/i);
});

test("client incident endpoint preserves method and origin protection", async () => {
  const methodReq = createMockReq({ method: "GET", url: "/api/client-errors" });
  const methodRes = createMockRes();
  await clientErrorsHandler(methodReq, methodRes);
  assert.equal(methodRes.statusCode, 405);
  assert.equal(methodRes.headers.Allow, "POST");

  const originReq = createMockReq({
    method: "POST",
    headers: { origin: "https://attacker.example" },
    body: { event: "runtime_error", route: "home", fingerprint: "error" },
    url: "/api/client-errors",
  });
  const originRes = createMockRes();
  await clientErrorsHandler(originReq, originRes);
  assert.equal(originRes.statusCode, 403);
});
