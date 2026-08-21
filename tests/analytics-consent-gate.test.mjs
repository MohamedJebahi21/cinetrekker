import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const umamiLoaderPath = new URL(
  "../src/components/UmamiAnalytics.tsx",
  import.meta.url,
);
const analyticsWrapperPath = new URL("../src/lib/analytics.ts", import.meta.url);
const vercelConfigPath = new URL("../vercel.json", import.meta.url);

test("Umami loader requires production, opt-in consent, and Do Not Track to be off", async () => {
  const source = await readFile(umamiLoaderPath, "utf8");

  assert.match(
    source,
    /!import\.meta\.env\.PROD\s*\|\|\s*!hasAcceptedConsent\s*\|\|\s*doNotTrackEnabled\(\)/,
  );
  assert.match(source, /return url\.protocol === "https:" \? url\.toString\(\) : null/);
  assert.match(source, /script\.async = true/);
  assert.doesNotMatch(source, /script\.defer = true/);
  assert.match(source, /script\.dataset\.excludeSearch = "true"/);
  assert.match(source, /script\.dataset\.doNotTrack = "true"/);
});

test("Content Security Policy permits only the Umami Cloud script and collection endpoints", async () => {
  const vercelConfig = await readFile(vercelConfigPath, "utf8");

  assert.match(vercelConfig, /script-src[^;]*https:\/\/cloud\.umami\.is/);
  assert.match(vercelConfig, /connect-src[^;]*https:\/\/cloud\.umami\.is/);
  assert.match(vercelConfig, /connect-src[^;]*https:\/\/gateway\.umami\.is/);
});

test("product-event wrapper independently requires stored opt-in consent and Do Not Track to be off", async () => {
  const source = await readFile(analyticsWrapperPath, "utf8");

  assert.match(source, /import \{ hasAcceptedCookieConsent \} from "@\/lib\/cookieConsent"/);
  assert.match(source, /!hasAcceptedCookieConsent\(\)/);
  assert.match(source, /doNotTrackEnabled\(\)/);
  assert.match(source, /typeof window === "undefined"/);
  assert.match(source, /catch \{\s*\/\/ Analytics must never disrupt the product experience\.\s*\}/);
});
