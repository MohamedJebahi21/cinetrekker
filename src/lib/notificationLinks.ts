export function parseNotificationTarget(
  movieId: string | null | undefined,
  type?: string | null,
) {
  if (typeof movieId !== "string") {
    return null;
  }

  const [mediaType, mediaIdText] = movieId.split("-");
  const mediaId = Number(mediaIdText);

  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isFinite(mediaId)) {
    return null;
  }

  const hash = type === "reply" || type === "comment" ? "#comments" : "";

  return {
    mediaType,
    mediaId,
    path: `/${mediaType}/${mediaId}${hash}`,
  };
}

export function getNotificationTarget(
  movieId: string | null | undefined,
  type?: string | null,
) {
  const target = parseNotificationTarget(movieId, type);
  if (!target) {
    return null;
  }

  return target.path;
}
