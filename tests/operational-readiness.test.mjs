import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) =>
  fs.readFileSync(path.join(root, relative), "utf8");

test("health endpoint is cache-safe, dependency-only, and does not return configuration values", () => {
  const source = read("api/health.js");

  assert.match(source, /Cache-Control", "no-store, max-age=0/);
  assert.match(source, /X-Robots-Tag", "noindex, nofollow/);
  assert.match(source, /dependencies,/);
  assert.match(source, /status: ready \? "ok" : "degraded"/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY:\s*getServerEnv/);
  assert.doesNotMatch(source, /TMDB_API_KEY:\s*getServerEnv/);
});

test("client incident reporting excludes raw errors, stacks, identifiers, and route paths", () => {
  const client = read("src/lib/operationalReporting.ts");
  const endpoint = read("api/client-errors.js");

  assert.match(client, /routeGroup/);
  assert.match(client, /errorFingerprint/);
  assert.match(client, /incidentKeys/);
  assert.doesNotMatch(client, /error\.stack/);
  assert.doesNotMatch(client, /error\.message/);
  assert.match(endpoint, /const ALLOWED_EVENTS/);
  assert.match(endpoint, /enforceRequestSecurity\(req, res, "client-errors"\)/);
  assert.doesNotMatch(endpoint, /body\.stack/);
  assert.doesNotMatch(endpoint, /body\.message/);
});

test("the public status route and localized support label remain available", () => {
  const app = read("src/App.tsx");
  const footer = read("src/components/Footer.tsx");

  assert.match(app, /path="\/status"/);
  assert.match(app, /ServiceStatus/);
  assert.match(footer, /to="\/status"/);
  assert.match(footer, /footer\.serviceStatus/);

  for (const locale of ["en", "ar", "fr", "tr", "es", "de"]) {
    const translations = read(`src/locales/${locale}.json`);
    assert.match(translations, /"serviceStatus"\s*:/);
  }
});
