# CSS foundation inventory

Reviewed after the async-state, mobile, and token adjustments. The stylesheet remains a single large file (`src/index.css`); this inventory records what was found without attempting a broad cascade rewrite.

## Token and literal-color review

The file defines semantic light, dark, and OLED palettes at the top, including background/foreground, surfaces, border, primary, muted, success, rating, and shadow tokens. Existing font tokens retain Space Grotesk for display and DM Sans for body text. The audited hover, watchlist, watched, switch, map-popup, and sticky-footer declarations now consume semantic tokens instead of isolated hex/RGB literals. The map marker retains a rating token as a decorative accent; the popup's title uses the theme foreground for readable contrast.

Intentional literals remain in image/hero overlays, dark media scrims, gradients, focus/compatibility fallbacks, and third-party Mapbox rendering. These are visual treatments or vendor compatibility values rather than semantic text/surface colors. No global palette rewrite was made.

## Contrast spot-check

WCAG relative-luminance calculations on the authored theme tokens (normal text, 4.5:1 criterion):

| Theme | Foreground on background | Muted foreground on background | White on primary |
|---|---:|---:|---:|
| Light | 15.50:1 | 5.08:1 | 6.57:1 |
| Dark | 16.64:1 | 7.75:1 | 5.31:1 |
| OLED | 21.00:1 | 9.96:1 | 4.96:1 |

These are token-pair checks, not a claim that every third-party image overlay or every component state has been exhaustively measured. Disabled text and decorative graphics are not normal-text contrast pairs.

## Cascade and `!important` inventory

There are 37 `!important` declarations in the current `src/index.css` (counted with `rg -o "!important" src --glob "*.css"`). No declarations were removed in this pass: the inventoried rules either preserve accessibility/reduced-motion behavior, override vendor-generated styles, or participate in theme/legacy cascade compatibility; none was confirmed safe to remove without a computed-style visual regression check. The rules cluster in the following selectors:

| Selector / area | Uses and rationale | Follow-up |
|---|---|---|
| OLED body and background utilities | Forces the OLED black canvas and OLED radial/background variants | Keep aligned with `[data-theme="oled"]` |
| Reduced-motion animation/transition overrides | Suppresses motion in OS and explicit reduced-motion modes | Preserve; verify any future animation additions against this rule |
| `.mapboxgl-popup-tip` | Overrides the Mapbox-generated popup pointer border | Vendor style specificity; retain |
| `.sr-only` | Enforces the accessible visually-hidden utility | Preserve utility semantics |
| `.mobile-nav-safe` | Resolves bottom-navigation safe-area stacking/spacing | Verify alongside `MobileBottomNav` and `DetailsActions` |
| `.topbar-search input::placeholder` | Keeps placeholder color visible over inherited input styling | Could be simplified only after checking all themes and browser defaults |
| Profile identity, premium hero, avatar, recap, and selected-tab selectors | Beats legacy utility/inline composition in profile surfaces | Consolidate only with profile screenshot/regression coverage |
| Footer, details hero backdrop, and legacy theme compatibility selectors | Maintains contrast/layering and backwards-compatible utility theme colors | Keep until those consumers are migrated to semantic tokens |

The stylesheet also contains repeated selectors for base layers, page shells, section headings, toolbars, list rows, media cards, navigation, profile regions, and sticky footers. Many are later responsive/theme overrides rather than identical declarations. A PostCSS duplicate-selector scan is advisory: do not merge these blocks without checking source order, media-query scope, and computed styles at all supported breakpoints/themes.

## Recommended next step

If this stylesheet is decomposed later, first extract theme tokens and base utilities without changing selector order, then migrate one component family at a time with visual regression captures for mobile/tablet/desktop and light/dark/OLED. This task intentionally did not restructure the cascade.
