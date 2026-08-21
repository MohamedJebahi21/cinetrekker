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

## Follow-up: Continue Watching zero-state height

The post-release live audit account has no in-progress show, so it renders Continue Watching’s zero-activity state. That state still reserves `460px` on desktop and contains a `320px` empty panel, while Fresh Discovery’s established empty-state treatment reserves `420px` at desktop and is less visually dominant. This is a distinct verified hierarchy mismatch from the loaded-card rail width correction.

### Follow-up remediation

Reduce the zero-state section to a `320px` desktop footprint with a `220px` internal empty panel. The heading, descriptive copy, View Watching List link, and Find a Show to Start action remain unchanged. No watched state, episode progress, or preference is read or mutated differently.
