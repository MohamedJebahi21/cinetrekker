import type { TFunction } from "i18next";

function lastSegmentTitleCase(key: string) {
  const segment = key.split(".").pop() || key;
  return segment
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

export function safeT(
  t: TFunction,
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
): string {
  const resolved = t(key, {
    defaultValue: fallback,
    ...options,
  }) as string;

  const missingKeyLabel = lastSegmentTitleCase(key);
  if (resolved === key || resolved === missingKeyLabel) {
    return fallback;
  }

  return resolved;
}
