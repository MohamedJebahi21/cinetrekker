# Definition of Done (DoD)

Use this checklist for all production-facing changes.

## 1) Code Quality

- [ ] Change is scoped and understandable.
- [ ] No dead code or stale imports were introduced.
- [ ] Naming is consistent with existing project conventions.
- [ ] Any new behavior is covered by tests or justified in PR notes.

## 2) Validation

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:security` passes for API-impacting changes.
- [ ] `npm run test:smoke` passes for app-shell and navigation-impacting changes.

## 3) Product and UX

- [ ] Empty, loading, and error states are handled.
- [ ] Mobile interaction and touch targets remain usable.
- [ ] Accessibility impact reviewed (labels, focus, contrast).
- [ ] Copy and user-facing text are clear and consistent.

## 4) Security and Data

- [ ] No secrets were added to source control.
- [ ] Input validation and authorization checks are in place where needed.
- [ ] New API paths include abuse/rate-limit considerations.
- [ ] Data flow respects user privacy and existing security docs.

## 5) Delivery Readiness

- [ ] CI checks are green.
- [ ] Documentation updated (`README.md` and/or `docs/`) when behavior changes.
- [ ] Rollback/recovery impact considered for risky changes.
- [ ] PR description includes test evidence and key risks.
