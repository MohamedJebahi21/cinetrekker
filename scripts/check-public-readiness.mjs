const baseUrl = (process.env.CINETREKKER_PUBLIC_URL || "https://cinetrekker.vercel.app").replace(/\/+$/, "");
const timeoutMs = Number(process.env.READINESS_TIMEOUT_MS || 10000);

const checks = [
  { path: "/api/health", kind: "health", expectedStatus: 200 },
  { path: "/status", kind: "public-page", expectedStatus: 200 },
  { path: "/notifications", kind: "public-page", expectedStatus: 200 },
  { path: "/trust", kind: "public-page", expectedStatus: 200 },
  { path: "/measurement", kind: "public-page", expectedStatus: 200 },
  { path: "/partnerships", kind: "public-page", expectedStatus: 200 },
];

function safeHealthSummary(text) {
  try {
    const body = JSON.parse(text);
    const dependencies = body && typeof body.dependencies === "object" ? body.dependencies : {};
    return {
      status: body?.status === "ok" || body?.status === "degraded" ? body.status : "unknown",
      dependencyHealth: Object.fromEntries(
        Object.entries(dependencies).map(([name, value]) => [name, value === true]),
      ),
    };
  } catch {
    return { status: "invalid-json", dependencyHealth: {} };
  }
}

async function checkRoute(check) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
    });
    const text = await response.text();
    const health = check.kind === "health" ? safeHealthSummary(text) : null;
    const ok = response.status === check.expectedStatus && (!health || health.status !== "invalid-json");
    return {
      path: check.path,
      httpStatus: response.status,
      ok,
      durationMs: Math.round(performance.now() - startedAt),
      ...(health ? { health } : {}),
    };
  } catch (error) {
    return {
      path: check.path,
      httpStatus: null,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      error: error?.name === "AbortError" ? "timeout" : "request-failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const check of checks) {
  results.push(await checkRoute(check));
}

const output = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  readOnly: true,
  passed: results.every((result) => result.ok),
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.passed) process.exitCode = 1;
