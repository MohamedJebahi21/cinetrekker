# Dependency security audit — after fixes

Generated: 2026-11-02 (verification rerun; local runtime is Node 26 while `.nvmrc` requires Node 22)

## Production dependency audit (`npm audit --omit=dev`)

| Severity | Alerts |
|---|---:|
| critical | 0 |
| high | 1 |
| moderate | 0 |
| low | 0 |
| info | 0 |
| Total | 1 |

## Full dependency audit (`npm audit`)

| Severity | Alerts |
|---|---:|
| critical | 0 |
| high | 1 |
| moderate | 0 |
| low | 0 |
| info | 0 |
| Total | 1 |

| Package | Severity | Direct | Scope | Affected range |
|---|---|---:|---|---|
| zod | high | yes | production or shared | <4.6.6 |

## Accepted remaining findings

- `zod` remains high severity at 3.25.76. The application uses it client-side only under `src/lib`; upgrading to Zod 4 requires a coordinated schema migration. This exact advisory is accepted temporarily through 2026-12-02 and is checked by `npm run audit:runtime`.
- The 11 prior development-only moderate findings were resolved through scoped overrides for `minimatch` and `postcss-selector-parser`; the latest full audit reports zero moderate findings.

Audit exit codes: production=1, full=1. The standard npm audit remains nonzero because it does not understand the documented exception. The custom runtime gate accepts only this one package/advisory/severity combination before its expiry and blocks any other high or critical production finding.
