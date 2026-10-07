import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV, normalizeRating, parseImportFile } from "../src/lib/importers/csvParser.ts";

test("parseCSV handles quotes, commas inside fields, and newlines correctly", () => {
  const csv = 'Name,Year,Rating\n"Fight Club",1999,5\n"Everything Everywhere All at Once, Part 1",2022,4.5\nInception,2010,4';
  const records = parseCSV(csv);
  assert.equal(records.length, 4);
  assert.deepEqual(records[0], ["Name", "Year", "Rating"]);
  assert.deepEqual(records[1], ["Fight Club", "1999", "5"]);
  assert.deepEqual(records[2], ["Everything Everywhere All at Once, Part 1", "2022", "4.5"]);
  assert.deepEqual(records[3], ["Inception", "2010", "4"]);
});

test("normalizeRating scales 0.5-5 star ratings to 1-10 accurately", () => {
  assert.equal(normalizeRating(5), 10);
  assert.equal(normalizeRating(4.5), 9);
  assert.equal(normalizeRating(3), 6);
  assert.equal(normalizeRating(0.5), 1);
  assert.equal(normalizeRating("4.5"), 9);
  assert.equal(normalizeRating(undefined), undefined);
});

test("parseImportFile accurately identifies and extracts Letterboxd watched.csv", () => {
  const letterboxdCSV = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2026-01-01,Dune: Part Two,2024,https://boxd.it/test,4.5,,,2026-01-01\n2026-01-02,Oppenheimer,2023,https://boxd.it/test2,5,,,2026-01-02`;
  const result = parseImportFile(letterboxdCSV, "watched.csv");

  assert.equal(result.source, "letterboxd_watched");
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].title, "Dune: Part Two");
  assert.equal(result.items[0].year, 2024);
  assert.equal(result.items[0].rating, 9);
  assert.equal(result.items[0].targetList, "watched");
  assert.equal(result.items[1].title, "Oppenheimer");
  assert.equal(result.items[1].rating, 10);
});

test("parseImportFile accurately identifies and extracts Letterboxd watchlist.csv", () => {
  const watchlistCSV = `Date,Name,Year,Letterboxd URI\n2026-02-01,Challengers,2024,https://boxd.it/test3\n2026-02-02,Furiosa,2024,https://boxd.it/test4`;
  const result = parseImportFile(watchlistCSV, "watchlist.csv");

  assert.equal(result.source, "letterboxd_watchlist");
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].title, "Challengers");
  assert.equal(result.items[0].targetList, "watchlist");
});

test("parseImportFile accurately identifies and extracts CineTrekker native JSON backups", () => {
  const json = JSON.stringify({
    version: "settings-export-v1",
    watched: [
      { media_id: 550, media_type: "movie", title: "Fight Club", rating: 10, watched_at: "2026-01-01T00:00:00Z" }
    ],
    watchlist: [
      { media_id: 157336, media_type: "movie", title: "Interstellar" }
    ]
  });

  const result = parseImportFile(json);
  assert.equal(result.source, "cinetrekker_json");
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].title, "Fight Club");
  assert.equal(result.items[0].tmdbId, 550);
  assert.equal(result.items[0].targetList, "watched");
  assert.equal(result.items[1].title, "Interstellar");
  assert.equal(result.items[1].tmdbId, 157336);
  assert.equal(result.items[1].targetList, "watchlist");
});
