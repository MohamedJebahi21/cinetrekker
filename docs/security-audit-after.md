# Dependency security audit — after fixes

Generated: 2026-11-02 00:54:13 +01:00

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
| moderate | 11 |
| low | 0 |
| info | 0 |
| Total | 12 |

| Package | Severity | Direct | Scope | Affected range |
|---|---|---:|---|---|
| @eslint/config-array | moderate | no | development only | * |
| @tailwindcss/typography | moderate | yes | development only | <=0.0.0-insiders.fda8ce5 // >=0.5.5 |
| @typescript-eslint/eslint-plugin | moderate | yes | development only | >=6.16.0 |
| @typescript-eslint/parser | moderate | yes | development only | >=6.16.0 |
| @typescript-eslint/type-utils | moderate | no | development only | >=6.16.0 |
| @typescript-eslint/typescript-estree | moderate | no | development only | >=6.16.0 |
| @typescript-eslint/utils | moderate | no | development only | >=6.16.0 |
| eslint | moderate | yes | development only | 0.7.1 - 2.0.0-rc.1 // >=4.1.0 |
| minimatch | moderate | no | development only | <11.0.1 |
| postcss-selector-parser | moderate | no | development only | <6.1.5 |
| typescript-eslint | moderate | yes | development only | * |
| zod | high | yes | production or shared | <4.6.6 |

## Accepted remaining findings

- `zod` remains high severity at 3.25.76. The application uses it client-side only under `src/lib`; npm proposes a breaking Zod 4 upgrade, which was explicitly accepted and not applied.
- The 11 moderate findings are development-only chains through minimatch (ESLint/typescript-eslint) and postcss-selector-parser (`@tailwindcss/typography`). npm proposes downgrading ESLint or typography to old versions; those breaking downgrades were explicitly accepted and not applied.

Audit exit codes: production=1, full=1. Nonzero reflects the accepted unresolved findings.
