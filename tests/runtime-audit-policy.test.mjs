import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRuntimeAudit } from "../scripts/runtime-audit-policy.mjs";

function reportFor(name, severity, advisoryId) {
  return {
    metadata: { vulnerabilities: { high: severity === "high" ? 1 : 0, critical: severity === "critical" ? 1 : 0 } },
    vulnerabilities: {
      [name]: {
        severity,
        via: [{ source: advisoryId, url: `https://github.com/advisories/${advisoryId}` }],
      },
    },
  };
}

test("accepts only the documented Zod advisory before its review date", () => {
  const result = evaluateRuntimeAudit(
    reportFor("zod", "high", "GHSA-mrhx-c7xc-m3w5"),
    new Date("2026-11-15T12:00:00.000Z"),
  );

  assert.equal(result.accepted.length, 1);
  assert.equal(result.blocked.length, 0);
});

test("blocks Zod when its accepted exception has expired", () => {
  const result = evaluateRuntimeAudit(
    reportFor("zod", "high", "GHSA-mrhx-c7xc-m3w5"),
    new Date("2026-12-03T00:00:00.000Z"),
  );

  assert.equal(result.accepted.length, 0);
  assert.equal(result.blocked[0]?.packageName, "zod");
});

test("blocks a different high-severity Zod advisory", () => {
  const result = evaluateRuntimeAudit(
    reportFor("zod", "high", "GHSA-xxxx-xxxx-xxxx"),
    new Date("2026-11-15T12:00:00.000Z"),
  );

  assert.equal(result.accepted.length, 0);
  assert.equal(result.blocked[0]?.packageName, "zod");
});

test("blocks critical severity even when the advisory id is accepted for high severity", () => {
  const result = evaluateRuntimeAudit(
    reportFor("zod", "critical", "GHSA-mrhx-c7xc-m3w5"),
    new Date("2026-11-15T12:00:00.000Z"),
  );

  assert.equal(result.accepted.length, 0);
  assert.equal(result.blocked[0]?.severity, "critical");
});

test("blocks a second high-severity advisory aggregated under the Zod entry", () => {
  const report = reportFor("zod", "high", "GHSA-mrhx-c7xc-m3w5");
  report.vulnerabilities.zod.via.push({
    source: "GHSA-1111-2222-3333",
    url: "https://github.com/advisories/GHSA-1111-2222-3333",
  });
  const result = evaluateRuntimeAudit(report, new Date("2026-11-15T12:00:00.000Z"));

  assert.equal(result.accepted.length, 0);
  assert.equal(result.blocked[0]?.packageName, "zod");
});

test("blocks all unaccepted high and critical package advisories", () => {
  const report = reportFor("other-package", "critical", "GHSA-aaaa-bbbb-cccc");
  const result = evaluateRuntimeAudit(report, new Date("2026-11-15T12:00:00.000Z"));

  assert.equal(result.blocked.length, 1);
  assert.equal(result.blocked[0]?.severity, "critical");
});

test("does not fail the runtime gate on moderate advisories", () => {
  const result = evaluateRuntimeAudit(
    reportFor("some-package", "moderate", "GHSA-aaaa-bbbb-cccc"),
    new Date("2026-11-15T12:00:00.000Z"),
  );

  assert.equal(result.accepted.length, 0);
  assert.equal(result.blocked.length, 0);
});
