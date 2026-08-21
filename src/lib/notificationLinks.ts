export function parseNotificationTarget(movieId: string | null | undefined) {
  if (typeof movieId !== "string") {
    return null;
  }

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

export function getNotificationTarget(movieId: string | null | undefined) {
  const target = parseNotificationTarget(movieId);
  if (!target) {
    return null;
  }

  return target.path;
}