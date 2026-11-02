# Dependency security exceptions

## Active exception

| Package | Advisory | Severity | Scope | Review by | Reason |
|---|---|---:|---|---|---|
| `zod` 3.25.x | `GHSA-mrhx-c7xc-m3w5` | High | Runtime dependency used by client-side schemas | 2026-12-02 | The advisory's patched release is Zod 4, which requires a breaking migration of the current schema layer. |

The exception applies only to this package and advisory identifier. `npm run audit:runtime` continues to fail for every other high or critical production advisory. The policy test verifies the package, advisory, severity threshold, and expiry behavior. On or after the review date, the exception stops applying and the gate fails until the migration is completed or maintainers deliberately renew a documented exception.

## Remediation plan

1. Inventory Zod schemas and their call sites.
2. Migrate to a patched major version in a separate reviewed change, preserving validation behavior and API error contracts.
3. Run the complete build, lint, type-check, unit, security, privacy, i18n, readiness, and browser suites.
4. Remove the exception and its policy tests once the vulnerable version is no longer installed.

The development-only `minimatch` and nested `postcss-selector-parser` advisories are handled through exact npm overrides in `package.json`; they are not exempted from audit output.
