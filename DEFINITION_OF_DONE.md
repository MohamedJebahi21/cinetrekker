# CineTrekker Definition of Done (DoD)

> **Universal Quality & Delivery Checklist**  
> Every task, bugfix, or feature must satisfy the applicable items below before being considered complete.

---

## 1. Functionality & Integrity

- [ ] **Intended behavior works**: The requested functionality works correctly under expected user input.
- [ ] **Edge cases handled**: Empty inputs, boundary values, network latency, and abnormal states are accommodated.
- [ ] **Existing behavior preserved**: No regressions introduced to existing tracking, watchlists, watched history, ratings, follows, or user settings.
- [ ] **Guest mode verified**: Guest user operations remain fully functional; authenticated sync flow remains unbroken.

---

## 2. Code Quality & Maintainability

- [ ] **No guessing**: All imports, tables, columns, endpoints, and types have been verified against actual repository files.
- [ ] **Existing code reused**: Leveraged existing utility functions (`src/lib/`), design primitives (`src/components/ui/`), and contexts rather than duplicating logic.
- [ ] **Minimal change**: Touched only necessary code lines. Unrelated formatting or refactoring was avoided.
- [ ] **TypeScript passes**: Type checking passes cleanly without introducing loose `any` casts (`npm run type-check`).
- [ ] **Linter passes**: Clean execution of `npm run lint`.
- [ ] **Dead code eliminated**: Removed unused imports, obsolete variables, and temporary debug console statements.

---

## 3. UI, Design System & Accessibility

- [ ] **Design tokens respected**: Used established color tokens (`primary`, `card`, `muted`, `border`, `rating-*`) from `tailwind.config.ts`.
- [ ] **Async UI states implemented**:
  - [ ] **Loading state**: Consistent skeleton placeholder (`skeleton-shimmer`).
  - [ ] **Empty state**: Clear, actionable guidance using existing `EmptyState` component.
  - [ ] **Error state**: Helpful recovery message with retry action where appropriate.
  - [ ] **Success state**: Toast notification (`sonner`) or inline indicator.
- [ ] **Responsive layouts**: Verified layout behavior on mobile (<640px), tablet (768px-1024px), and desktop (1280px+).
- [ ] **Accessibility (WCAG 2.2 AA)**:
  - [ ] Interactive elements are semantic (`<button>`, `<a>`).
  - [ ] Minimum 44×44px mobile touch targets maintained.
  - [ ] Accessible names provided for icon-only buttons (`aria-label`).
  - [ ] Reduced motion settings honored (`prefers-reduced-motion`).
  - [ ] RTL layout stability maintained for Arabic (`dir="rtl"`).
- [ ] **i18n completeness**: All user-visible strings are localized using `t(...)` across all supported languages (`en`, `fr`, `ar`, `es`, `de`, `tr`). Run `npm run i18n:verify`.

---

## 4. Security & Privacy

- [ ] **Zero secrets in client**: No private API keys or tokens added to client bundles or `.env.example`.
- [ ] **Row Level Security (RLS)**: Any database query adheres strictly to user-scoped RLS policies.
- [ ] **Authorization enforced**: Serverless endpoints in `api/` validate origins, HTTP methods, rate limits, and bearer tokens.
- [ ] **Private profile isolation**: Profile reads honor user privacy settings; discovery occurs only via audited `SECURITY DEFINER` RPCs.
- [ ] **Privacy-preserving telemetry**: No plain-text PII (emails, raw IPs, user search terms, watched media titles) sent to monitoring tools.

---

## 5. Performance & Resource Efficiency

- [ ] **Minimal re-renders**: Stable hooks, memoization where appropriate, and decoupled context subscriptions.
- [ ] **Asset budget respected**: Initial bundle footprint stays within budget (`npm run check:bundle`).
- [ ] **Network efficiency**: Reused TanStack Query cache; avoided duplicate queries or waterfalls.
- [ ] **Database performance**: Added necessary indexes for foreign keys or filter predicates in migrations.

---

## 6. Verification & Automated Testing

- [ ] `npm run lint` passes without errors.
- [ ] `npm run type-check` passes cleanly.
- [ ] `npm run test:security` passes (mandatory for any API, auth, or security change).
- [ ] `npm run test:privacy` passes (mandatory for profile, user data, or RLS changes).
- [ ] `npm run i18n:verify` passes (mandatory for any UI copy change).
- [ ] `npm run test:unit` passes for touched features.
- [ ] `npm run build` succeeds.
- [ ] Browser smoke or Playwright verification performed where applicable.

---

## 7. Persistent Documentation Updates

- [ ] `PROJECT_CONTEXT.md` updated with new features, routes, data models, or resolved known issues.
- [ ] `ARCHITECTURE.md` updated if system topology, security boundaries, or data flows changed.
- [ ] `CHANGELOG.md` entry recorded in the canonical format.
