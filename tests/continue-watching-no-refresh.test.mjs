import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/hooks/useContinueWatchingViewModel.ts", import.meta.url),
  "utf8",
);
const componentSource = await readFile(
  new URL("../src/components/ContinueWatching.tsx", import.meta.url),
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

test("Continue Watching labels retained data as refreshing and suppresses stale episode actions", () => {
  assert.match(source, /isRefreshing: query\.isPlaceholderData/);
  assert.match(componentSource, /const \{ data, isLoading, isRefreshing, error, refetch \} = useContinueWatchingViewModel\(\)/);
  assert.match(componentSource, /!isRefreshing &&/);
  assert.match(componentSource, /Syncing your episode progress/);
  assert.match(componentSource, /isRefreshing=\{isRefreshing\}/);
});
