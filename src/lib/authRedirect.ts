export const OAUTH_RETURN_PATH_STORAGE_KEY = "cinetrekker_oauth_return_path";

export function getSafeInternalRedirect(value: unknown): string {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//")
    ? trimmed
    : "/";
}

export function saveOAuthReturnPath(path: unknown): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    OAUTH_RETURN_PATH_STORAGE_KEY,
    getSafeInternalRedirect(path),
  );
}

export function consumeOAuthReturnPath(): string {
  if (typeof window === "undefined") return "/";
  const path = window.sessionStorage.getItem(OAUTH_RETURN_PATH_STORAGE_KEY);
  window.sessionStorage.removeItem(OAUTH_RETURN_PATH_STORAGE_KEY);
  return getSafeInternalRedirect(path);
}
