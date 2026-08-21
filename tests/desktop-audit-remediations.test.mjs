import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("desktop audit remediations keep consent controls out of primary content and enlarge guest-auth targets", async () => {
  const [cookieConsent, auth] = await Promise.all([
    source("src/components/CookieConsent.tsx"),
    source("src/pages/Auth.tsx"),
  ]);

  assert.match(cookieConsent, /lg:inset-x-auto/);
  assert.match(cookieConsent, /lg:bottom-6/);
  assert.match(cookieConsent, /lg:right-6/);
  assert.match(cookieConsent, /lg:w-\[min\(28rem,calc\(100vw-3rem\)\)\]/);
  assert.doesNotMatch(cookieConsent, /lg:flex-row/);

  assert.match(auth, /min-h-8 min-w-8/);
  assert.match(auth, /aria-label=\{t\("auth\.passwordRules"/);
  assert.match(auth, /label htmlFor="remember-me" className="flex min-h-11/);
  assert.match(auth, /<Checkbox\s+id="remember-me"\s+className="h-5 w-5"/);
});
