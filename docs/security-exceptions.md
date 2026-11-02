# Dependency security exceptions

## Active exceptions

There are currently no active dependency security exceptions. All runtime dependencies pass `npm run audit:runtime` with zero unaccepted high or critical production advisories.

## Resolved exceptions

| Package | Advisory | Severity | Scope | Resolved | Resolution |
|---|---|---:|---|---|---|
| `zod` | `GHSA-mrhx-c7xc-m3w5` | High | Runtime dependency used by client-side schemas | 2026-11-02 | Upgraded to `zod@^4.6.7`. Migrated `result.error.errors` to `result.error.issues` contract in `src/lib/validation.ts`. Isolated into cached `vendor-validation` bundle chunk to preserve budget. |

## Exception policy

When an unfixable high or critical runtime vulnerability is discovered without an immediate safe patch:
1. Document the package, advisory ID, severity, scope, review-by date, and rationale in this document.
2. Add a time-limited entry to `RUNTIME_AUDIT_EXCEPTIONS` in `scripts/runtime-audit-policy.mjs`.
3. The exception is enforced by `npm run audit:runtime` and validated by unit tests. On or after the review date, the gate strictly fails until remediated or deliberately renewed.
