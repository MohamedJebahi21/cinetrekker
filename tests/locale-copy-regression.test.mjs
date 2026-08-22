import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const localeCodes = ["ar", "fr", "tr", "es", "de"];
const intentionallyEquivalentKeys = new Set([
  "common.appName",
  "common.no",
  "actions.error",
  "common.details",
  "common.optional",
  "common.pagination",
  "nav.menu",
  "nav.themeOled",
  "nav.genres",
  "calendar.inHours",
  "calendar.unknownChannel",
  "search.streaming",
  "search.langOptions.hindi",
  "search.streamingOptions.netflix",
  "search.streamingOptions.amazonPrime",
  "search.streamingOptions.disneyPlus",
  "search.streamingOptions.max",
  "search.streamingOptions.hulu",
  "search.streamingOptions.appleTv",
  "search.streamingOptions.paramount",
  "stats.total",
  "details.minutes",
  "details.genres",
  "details.status",
  "details.streaming",
  "privacy.contact",
  "filters.genre",
  "filters.streaming",
  "filters.status",
  "footer.contact",
  "footer.legal",
  "profile.agePlaceholder",
  "profile.levelCinephile",
  "awards.filterActor",
  "awards.categoryOscar",
  "awards.categoryEmmy",
  "awards.categoryGoldenGlobe",
  "awards.categoryBafta",
  "commandPalette.collections",
  "bingeTimer.pause",
  "bingeTimer.start",
  "feedback.nameLabel",
  "feedback.emailLabel",
  "feedback.emailPlaceholder",
  "feedback.messageLabel",
  "locationDetails.source",
  "watchHistory.sortAlpha",
  "yearInReview.tabs.genres",
]);

function flatten(value, prefix = "", result = {}) {
  if (typeof value === "string") {
    result[prefix] = value;
    return result;
  }
  for (const [key, child] of Object.entries(value ?? {})) {
    flatten(child, prefix ? `${prefix}.${key}` : key, result);
  }
  return result;
}

function normalise(value) {
  return value.trim().replace(/\s+/g, " ");
}

const localeDirectory = new URL("../src/locales/", import.meta.url);
const english = flatten(JSON.parse(await readFile(new URL("en.json", localeDirectory), "utf8")));

test("supported locales do not retain copied English UI values outside audited brands and language-identical terms", async () => {
  for (const localeCode of localeCodes) {
    const locale = flatten(JSON.parse(await readFile(new URL(`${localeCode}.json`, localeDirectory), "utf8")));
    const copiedEnglish = Object.entries(english)
      .filter(([key, englishValue]) => normalise(locale[key] ?? "") === normalise(englishValue))
      .map(([key]) => key)
      .filter((key) => !intentionallyEquivalentKeys.has(key));

    assert.deepEqual(copiedEnglish, [], `${localeCode} still contains copied-English locale values`);
  }
});

test("the enhanced notification and Preferences labels are translated in every supported locale", async () => {
  const interfaceKeys = [
    "preferences.quickControls",
    "preferences.currentTheme",
    "notifications.emptyTitle",
    "notifications.emptyDescription",
    "notifications.exploreCalendar",
  ];

  for (const localeCode of localeCodes) {
    const locale = flatten(JSON.parse(await readFile(new URL(`${localeCode}.json`, localeDirectory), "utf8")));
    for (const key of interfaceKeys) {
      assert.notEqual(normalise(locale[key]), normalise(english[key]), `${localeCode}:${key} must not fall back to English`);
    }
  }
});
