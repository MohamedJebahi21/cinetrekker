export function normalizePinnedFavoriteKeys(keys: string[]): string[] {
  const movieKeys: string[] = [];
  const seriesKeys: string[] = [];

  keys.forEach((key) => {
    if (key.startsWith('movie-') && !movieKeys.includes(key)) {
      movieKeys.push(key);
      return;
    }

    if (key.startsWith('tv-') && !seriesKeys.includes(key)) {
      seriesKeys.push(key);
    }
  });

  return [...movieKeys, ...seriesKeys];
}
