export function normalizePinnedFavoriteKeys(keys: string[]): string[] {
  const movieKeys: string[] = [];
  const seriesKeys: string[] = [];

  keys.forEach((key) => {
    if (key.startsWith('movie-') && movieKeys.length < 4) {
      movieKeys.push(key);
      return;
    }

    if (key.startsWith('tv-') && seriesKeys.length < 4) {
      seriesKeys.push(key);
    }
  });

  return [...movieKeys, ...seriesKeys];
}
