import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("personalized recommendations explain their basis without untranslated fallback copy", async () => {
  const [recommendations, carousel, ...locales] = await Promise.all([
    read("src/components/BecauseYouLiked.tsx"),
    read("src/components/MediaCarouselEnhanced.tsx"),
    ...["en", "ar", "fr", "tr", "es", "de"].map((locale) =>
      read(`src/locales/${locale}.json`),
    ),
  ]);

  assert.match(recommendations, /home\.basedOnRecentActivity/);
  assert.match(recommendations, /home\.basedOnRecentActivityDesc/);
  assert.match(recommendations, /home\.becauseYouLikedContext/);
  assert.doesNotMatch(recommendations, /\?\s*"Based on Your Recent Activity"/);

  assert.match(carousel, /description\?: string/);
  assert.match(carousel, /aria-describedby=\{description \? descriptionId : undefined\}/);
  assert.match(carousel, /text-muted-foreground/);

  for (const locale of locales) {
    assert.match(locale, /"basedOnRecentActivity"\s*:\s*".+"/);
    assert.match(locale, /"basedOnRecentActivityDesc"\s*:\s*".+"/);
    assert.match(locale, /"becauseYouLikedContext"\s*:\s*".+"/);
  }
});
