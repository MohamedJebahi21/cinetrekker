import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import followHandler from "../api/follow.js";
import feedbackHandler from "../api/feedback.js";
import tmdbProxyHandler from "../api/tmdb-proxy.js";
import cronHandler from "../api/jobs/check-followed-updates.js";
import {
  ensureRequestId,
  resetRequestSecurityStateForTests,
  setRateLimitDependenciesForTests,
} from "../api/_lib/requestSecurity.js";
import {
  resetAuthUserResolverForTests,
  setAuthUserResolverForTests,
} from "../api/_lib/supabaseAdmin.js";
import { resetSecurityAlertsForTests } from "../api/_lib/securityMonitor.js";

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
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.RECAPTCHA_SECRET_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.FEEDBACK_TO_EMAIL;
});

afterEach(() => {
  resetRequestSecurityStateForTests();
  resetAuthUserResolverForTests();
  resetSecurityAlertsForTests();
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
