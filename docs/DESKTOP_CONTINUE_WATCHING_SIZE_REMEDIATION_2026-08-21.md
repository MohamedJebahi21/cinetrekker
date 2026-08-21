# Continue Watching Size Alignment Remediation

**Scope:** Homepage Continue Watching rail, all themes and breakpoints.
**Reference pattern:** Fresh Discovery `MediaCarouselEnhanced` title-card widths.

## Confirmed mismatch

Continue Watching uses feature-card widths of `360px` to `420px` on desktop, while Fresh Discovery uses the established responsive rail widths of `180px`, `200px`, `220px`, and `240px`. This makes Continue Watching visually dominate the homepage and interrupts the otherwise consistent discovery-rail rhythm.

## Remediation

Apply Fresh Discovery’s responsive width contract to Continue Watching’s loaded cards and loading skeletons:

| Breakpoint | Continue Watching width after change |
| --- | --- |
| Base | `calc(50vw - 1.5rem)` |
| `sm` | `180px` |
| `md` | `200px` |
| `lg` | `220px` |
| `xl` | `240px` |

The content hierarchy, progress display, Detail route, explicit **Mark Next Episode** action, enrichment behavior, scroll/pagination logic, and empty/error states remain unchanged. The adjustment modifies only rail geometry and compact-card spacing to maintain readable controls at the shared width.

## Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Desktop alignment | Continue Watching uses the same `lg` and `xl` card widths as Fresh Discovery. |
| Responsive alignment | Base, `sm`, and `md` widths match Fresh Discovery’s rail contract. |
| Loading consistency | Continue Watching skeleton cards use the same width contract as loaded cards. |
| Data safety | No watched episodes, progress, list state, or preferences are changed by rendering. |
| Regression coverage | A focused test locks the shared width classes and preserves the Details / Mark Next Episode actions. |
| Validation | Unit suite, full quality gate, production build, and live desktop verification pass. |
