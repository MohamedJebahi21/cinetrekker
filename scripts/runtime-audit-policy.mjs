export const RUNTIME_AUDIT_EXCEPTIONS = [
  {
    packageName: "zod",
    advisoryId: "GHSA-mrhx-c7xc-m3w5",
    severity: "high",
    expiresAt: "2026-12-02",
    reason: "Zod 3 is currently used by client-side schemas; the patched Zod 4 release requires a breaking schema migration.",
  },
];

const severityRank = { low: 0, moderate: 1, high: 2, critical: 3 };

function getAdvisoryIds(vulnerability) {
  return (vulnerability.via ?? [])
    .filter((entry) => entry && typeof entry === "object")
    .flatMap((entry) => {
      const urlId = typeof entry.url === "string"
        ? entry.url.match(/GHSA-[a-z0-9-]+/i)?.[0]
        : null;
      return [entry.source, entry.id, urlId].filter((value) => typeof value === "string");
    });
}

export function evaluateRuntimeAudit(report, now = new Date()) {
  if (!report || !report.metadata?.vulnerabilities || !report.vulnerabilities) {
    throw new TypeError("npm audit returned an invalid report.");
  }

  const accepted = [];
  const blocked = [];

  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities)) {
    if ((severityRank[vulnerability.severity] ?? -1) < severityRank.high) continue;

    const advisoryIds = [...new Set(getAdvisoryIds(vulnerability))];
    const exception = RUNTIME_AUDIT_EXCEPTIONS.find((candidate) =>
      candidate.packageName === packageName &&
      vulnerability.severity === candidate.severity &&
      advisoryIds.includes(candidate.advisoryId) &&
      advisoryIds.filter((id) => /^GHSA-/i.test(id)).every((id) => id === candidate.advisoryId) &&
      now.getTime() <= Date.parse(`${candidate.expiresAt}T23:59:59.999Z`),
    );

    if (exception) {
      accepted.push({ packageName, advisoryId: exception.advisoryId, expiresAt: exception.expiresAt, reason: exception.reason });
    } else {
      blocked.push({ packageName, severity: vulnerability.severity, advisoryIds });
    }
  }

  return { accepted, blocked };
}
