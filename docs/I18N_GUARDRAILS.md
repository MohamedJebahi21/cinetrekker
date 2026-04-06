# i18n Guardrails

CineTrekker now ships with a small set of commands that keep locale coverage healthy.

## Commands

- `npm run i18n:audit` shows missing keys per locale.
- `npm run i18n:audit:strict` exits with a failure when any locale is missing keys.
- `npm run i18n:fill` copies missing English keys into locale files.
- `npm run i18n:fill:check` checks what would be added without writing files.
- `npm run i18n:verify` runs the strict audit and the fill check together.
- `npm run i18n:report` writes a markdown coverage summary to `i18n-coverage-report.md`.

## CI

The GitHub Actions workflow at [.github/workflows/i18n-coverage-check.yml](../.github/workflows/i18n-coverage-check.yml) runs the verify command and uploads the coverage summary artifact for inspection.
