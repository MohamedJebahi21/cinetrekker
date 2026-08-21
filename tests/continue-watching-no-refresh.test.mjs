import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/hooks/useContinueWatchingViewModel.ts", import.meta.url),
  "utf8",
);

test("Continue Watching retains its current view model during episode-mark query rekeys", () => {
  assert.match(source, /import \{ keepPreviousData, useQuery, useQueryClient \} from "@tanstack\/react-query"/);
  assert.match(source, /placeholderData: keepPreviousData/);
  assert.match(source, /watchedHash/);
});

test("Continue Watching exposes loading only when no current or placeholder view model exists", () => {
  assert.match(source, /isLoading: \(query\.isLoading && !query\.data\) \|\| watchedItemsLoading/);
  assert.doesNotMatch(source, /isLoading: query\.isLoading \|\| watchedItemsLoading/);
});
