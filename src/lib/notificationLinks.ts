export function parseNotificationTarget(movieId: string) {
  const [mediaType, mediaIdText] = movieId.split("-");
  const mediaId = Number(mediaIdText);

  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isFinite(mediaId)) {
    return null;
  }

  return {
    mediaType,
    mediaId,
    path: `/${mediaType}/${mediaId}`,
  };
}

export function getNotificationTarget(movieId: string) {
  const target = parseNotificationTarget(movieId);
  if (!target) {
    return null;
  }

  return target.path;
}