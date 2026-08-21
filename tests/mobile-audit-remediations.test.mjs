import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("mobile audit remediations preserve navigation position, form access, and compact-screen hierarchy", async () => {
  const [scrollToTop, bottomNav, footer, hero, nav, guestBanner, discover, details, carousel] = await Promise.all([
    source("src/components/ScrollToTop.tsx"),
    source("src/components/MobileBottomNav.tsx"),
    source("src/components/Footer.tsx"),
    source("src/components/HeroSection.tsx"),
    source("src/components/UnifiedNav.tsx"),
    source("src/components/GuestSyncBanner.tsx"),
    source("src/pages/Discover.tsx"),
    source("src/pages/Details.tsx"),
    source("src/components/MediaCarouselEnhanced.tsx"),
  ]);

  assert.match(scrollToTop, /useNavigationType/);
  assert.match(scrollToTop, /navigationType === "POP"/);
  assert.match(scrollToTop, /positions\.current\.get\(location\.key\)/);

  assert.match(bottomNav, /const isFeedbackRoute = pathname === "\/feedback"/);
  assert.match(bottomNav, /input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\), textarea, select/);
  assert.match(bottomNav, /if \(isFeedbackRoute \|\| isEditing\)/);

  assert.match(footer, /flex flex-col items-start gap-3 sm:flex-row/);
  assert.match(footer, /w-full text-left text-xs/);

  assert.match(hero, /home\.mobilePageTitle/);
  assert.match(hero, /home\.selectFeaturedTitle/);
  assert.match(hero, /aria-pressed=\{isActive\}/);

  assert.match(nav, /mobileNavigationGroups/);
  assert.match(nav, /nav\.accountOnlyDescription/);
  assert.match(nav, /topbar-search hidden min-w-0 flex-1 sm:block/);
  assert.match(nav, /to="\/search"/);

  assert.match(guestBanner, /GUEST_SYNC_GUIDANCE_KEY/);
  assert.match(guestBanner, /guest\.localSyncCompact/);

  assert.match(discover, /getBackdropUrl\(item\.backdrop_path, "w780"\)/);
  assert.match(discover, /const \[deferredDiscoveryReady, setDeferredDiscoveryReady\]/);
  assert.match(discover, /enabled: deferredDiscoveryReady/);
  assert.match(discover, /min-h-11 rounded-lg/);
  assert.match(discover, /aria-pressed=\{activeMood === i\}/);

  assert.match(details, /className="h-11 w-11 rounded-full"[\s\S]{0,200}aria-label="Scroll videos left"/);
  assert.match(details, /className="h-11 w-11 rounded-full"[\s\S]{0,200}aria-label="Scroll videos right"/);
  assert.match(carousel, /<span>Swipe<\/span>/);
});
