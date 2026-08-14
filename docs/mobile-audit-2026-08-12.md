# CineTrekker — Mobile Compatibility Audit (2026-08-12)

**Report-only audit.** Scope: 320 / 375 / 414px phones, tablet (768–1024px), iOS Safari,
PWA/add-to-homescreen. Method: 3 parallel code sweeps (layout, touch/interaction,
viewport/iOS/perf) plus direct review of `index.html`, `index.css`, `tailwind.config.ts`,
`vite.config.ts`, and PWA/manifest config. Top findings spot-verified against source.

**Overall:** the app is already well-built for mobile in most respects — a 44px touch-height
baseline for real buttons (`@media (pointer: coarse)` in `index.css`), safe-area utilities used
in the main nav / bottom nav / cookie / sticky-save bars, responsive grids with small bases,
viewport-capped dialogs/sheets, `overflow-x` clipping, `100dvh` on the app shell, backdrop-blur
disabled on `.ct-*` panels below 768px, and exemplary responsive images in `MediaCard`. The
issues below are the exceptions.

---

## 🔴 Critical

### C1 — iOS auto-zoom on input focus (app-wide)
`src/components/ui/input.tsx:11` — the base `Input` is `text-sm` (14px < 16px), so iOS Safari
zooms the page on focus of **every** field: login/signup (`Auth.tsx:218,242,294,357`), the
always-present header search (`SearchDropdown.tsx:395` re-adds `text-sm`), and dozens more
(Feedback, Following, Watched, Profile, Calendar, GenreBrowser, AgeVerificationDialog…). Worst
instance: `AwardWinners.tsx:621` uses `text-xs` (12px) → maximum zoom. Related:
`Profile.tsx:2221` is a hand-rolled `<textarea class="text-sm">` (the shadcn `Textarea` is
already 16px and safe).
*Device: all iPhones, primary flows.*

### C2 — "Hide recommendation" action unreachable on touch
`src/pages/Recommendations.tsx:207-218` (carousel cards) and `:336-342` (podium ranks #2/#3):
the Hide button is `opacity-0 … group-hover/card:opacity-100` with no tap/focus fallback. On
touch there is no hover, so the feature cannot be used at all (rank #1 at `:292-299` is fine —
always-visible text button). Buttons are also 24–28px wide.
*Device: all touch devices.*

### C3 — Multi-MB image for a faint decorative banner
`src/pages/Profile.tsx:1827` — the profile cover loads `getBackdropUrl(..., "original")` (often
3840×2160) into a 200px-tall `opacity-15` strip, with no `loading="lazy"` and no dimensions.
Full-resolution download + decode on cellular/low-end devices for something barely visible.
*Device: all mobile, worst on cellular/low-end.*

---

## 🟠 Moderate

### M1 — Other hover-only quick actions (alternate path exists → not critical)
`Calendar.tsx:896-921` (quick watchlist/follow toggles, hover-revealed, 24px) — reachable by
tapping the card → dialog. `Following.tsx:552-561` (quick-unfollow, hover-hidden;
`group-focus-within` is a weak fallback since the card is not tap-focusable).
*Device: all touch.*

### M2 — Repeated essential controls under 44px width
`Settings.tsx:750-758,772-780` font-size steppers (−/+, 32px), `Details.tsx:1492-1504`
per-episode "watched" toggle (32px), `WatchedStatusDialog.tsx:113-132` the 10 rating stars
(~24px each, 8px gaps — small **and** crowded; the primary rating input). These get 44px height
from the coarse-pointer baseline but stay too narrow.
*Device: all touch, worst on phones.*

### M3 — Fixed/sticky elements ignoring the safe area
Status bar is `black-translucent` + `viewport-fit=cover`, so these clip under the
notch/home-indicator: `ui/toast.tsx:16` (mobile toast pinned `top-0`, only `p-4`, no
`safe-area-inset-top`), `App.tsx:118` (sticky-top offline banner, topmost element, no
safe-area-top), `ErrorBoundary.tsx:98` (fixed-bottom offline indicator, no
`safe-area-inset-bottom`, also overlaps the bottom nav).
*Device: notched iPhones; offline states.*

### M4 — `100vh` on centered containers
`EmptyStates.tsx:302`, `TitleStatus.tsx:33`, `YearInReview.tsx:223` center content against
`min-h-screen` (100vh), so with the mobile URL bar visible the content sits off-center/below the
fold. (`Auth.tsx:190` does it right with `min-h-[100dvh]`.)
*Device: mobile Safari/Chrome.*

### M5 — Always-on backdrop-blur stack
`UnifiedNav.tsx:307` (`backdrop-blur-xl`) + `MobileBottomNav.tsx:24` (`backdrop-blur-[20px]`)
are full-width and always visible; the mobile `backdrop-filter:none` rule only covers `.ct-*`
classes, not inline Tailwind blur. On the Details page add `Details.tsx:976` + `:1590`. 2–4 live
blur layers = scroll jank.
*Device: low-end Android / older iPhones.*

### M6 — Oversized hero backdrops
`HeroSection.tsx:61,69,119` always load `w1280` (and preload the next slide at w1280) regardless
of viewport; `w780` suffices on ~390px phones.
*Device: all phones (perf).*

### M7 — Cramped responsive grids
`EnhancedStats.tsx:323` 4-column `TabsList` with multi-word labels ("Taste & Era", "History
List") wrap/crowd at 320–414px (no `grid-cols-2` fallback). `Calendar.tsx:984,991` month view is
always `grid-cols-7`; cells ~40–48px wide at 320–375px (no compact/list fallback for phones).
`Discover.tsx:284` 8-category grid stays 4-wide at base; labels wrap at 320.
*Device: 320–414px.*

### M8 — Password rules only in a hover/focus tooltip
`Auth.tsx:269-291` — Radix tooltip listing password requirements is unreliable on touch (opens
on focus, dismisses on next tap). No always-visible equivalent during signup.
*Device: all touch.*

### M9 — No PWA web app manifest, no theme-color
No `manifest.json`/`.webmanifest`, no `<link rel="manifest">`, no PWA plugin in `vite.config.ts`,
and no `<meta name="theme-color">`/`color-scheme`. On Android/Chrome the app is not installable
(no standalone display mode, no install prompt, no maskable icons); "Add to Home Screen" only
bookmarks. iOS is partly covered (`apple-mobile-web-app-capable` + 180×180 `apple-touch-icon`),
so it opens standalone there.
*Device: Android/Chrome install; browser-chrome tinting everywhere.*

---

## 🟡 Minor

- **Icon buttons under 44px wide** (44px tall from baseline, so functional): `Calendar.tsx:676-704`
  pager (36px), `Achievements.tsx:994-1001` / `Following.tsx:608-617` / `MediaComments.tsx:108-115`
  share/delete (28px), `MediaComments.tsx:432-442` (24px), `WatchlistFilters.tsx:77-95` (32px),
  `Profile.tsx:2617-2630,2806-2819` unpin (32px). Systemic: `Button size="icon"` = 40px wide
  (`ui/button-variants.ts:23`) unless given `w-11`.
- **Dialog/Sheet/Toast close "X" too small:** `ui/dialog.tsx:46-49` (~20px, every dialog),
  `ui/sheet.tsx:84-89`, `ui/toast.tsx:71`, `TrailerModal.tsx:87-91` (~36px).
- **Targets too close:** `Details.tsx:978-990` sticky section nav uses `gap-0.5` (2px) between
  scrolling buttons.
- **`min-h-screen` (100vh) on ~18 page shells** (Index, Details, Discover, Watched, Watchlist,
  Recommendations, Following, EnhancedStats, Achievements, Person, About/Terms/Privacy/Cookies,
  Calendar…) — redundant with the app root's `min-h-[100dvh]`; causes a slight height/gap wobble
  as the URL bar toggles. Consider `min-h-[100dvh]`.
- **`<img>` without `loading="lazy"`:** `Recommendations.tsx:770`, `Search.tsx:313` (provider
  logos), `Calendar.tsx:1270` (w92 poster). Low impact.
- **Info hidden until hover:** `Watched.tsx:310-315` grid card title/year/rating are
  `opacity-0 group-hover:opacity-100` → on touch only the poster shows, titles unreadable.
- **Horizontal scrollers** (~20 rails) lack `-webkit-overflow-scrolling: touch`; iOS ≥13 has
  momentum by default and most use `overscroll-x-contain`/snap, so low risk — note only.
- **`UserProfileDropdown.tsx:88-97`** uses `!min-h-9` (`!important`), overriding the 44px
  coarse-pointer baseline to 36px (tablet topbar only).
- **`Calendar.tsx:689`** date pager (`min-w-[150px]` + two chevrons + "Today", no wrap) is tight
  against the ~288px content area at 320px.
- **Stray `public/apple.touch-icon.png`** (dot-typo, unreferenced) alongside the correct
  `apple-touch-icon.png`.

---

## Notes / non-issues
- Well-handled and confirmed correct: `MediaCard` (separate `md:hidden` always-visible 44px touch
  actions), `SearchDropdown`/`Search` (explicit 44px), `HeroSection` swipe (horizontal-only,
  never blocks vertical scroll; 44px arrows), `NotificationBell`/`pagination-dots` (44px on
  mobile), main nav + bottom nav + cookie + sticky-save bars (all use `env(safe-area-inset-*)`),
  shadcn `Textarea` (16px, no zoom), all dialogs/sheets viewport-capped. No `type="date"/"time"`
  inputs; `type="file"` inputs are `hidden` (button-triggered). No `framer-motion drag` /
  `onDoubleClick` / `onContextMenu`.
- Aside: `RatingInput.tsx` and `ui/carousel.tsx` (embla) are **dead code** — defined, not
  rendered anywhere.
- Inconsistency: `Profile.tsx:2221` bio editor is a hand-rolled `<textarea class="text-sm">`
  (14px → iOS zoom) instead of the safe shadcn `Textarea`.
