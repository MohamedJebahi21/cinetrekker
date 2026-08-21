import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/SearchDropdown.tsx", import.meta.url),
  "utf8",
);
const commandPaletteSource = await readFile(
  new URL("../src/components/CommandPalette.tsx", import.meta.url),
  "utf8",
);

test("global search includes privacy-curated CineTrekker member results", () => {
  assert.match(source, /import \{ socialService \} from "@\/services\/social"/);
  assert.match(source, /socialService\.listPublicProfiles\(q\)/);
  assert.match(source, /media_type: "user" as const/);
  assert.match(source, /const merged = \[\.\.\.members, \.\.\.movies, \.\.\.shows, \.\.\.actors, \.\.\.directors\]/);
});

test("global member results use public-profile routes and external avatars", () => {
  assert.match(source, /if \(item\.media_type === "user"\) return `\/user\/\$\{item\.id\}`/);
  assert.match(source, /if \(item\.media_type === "user"\) return item\.avatar_url \|\| null/);
  assert.match(source, /const isMember = item\.media_type === "user"/);
  assert.match(source, /src=\{itemImage\}/);
  assert.match(source, /item\.media_type !== "user"/);
});

test("command palette includes public members and navigates to their profile route", () => {
  assert.match(commandPaletteSource, /socialService\.listPublicProfiles\(query\.trim\(\)\)/);
  assert.match(commandPaletteSource, /navigate\(`\/user\/\$\{profile\.user_id\}`\)/);
  assert.match(commandPaletteSource, /key=\{`user-\$\{profile\.user_id\}`\}/);
  assert.match(commandPaletteSource, /<CommandShortcut>Member<\/CommandShortcut>/);
});
