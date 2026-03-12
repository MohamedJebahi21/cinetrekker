export function humanizeUiText(input: string): string {
  if (!input) return input;

  const trimmed = input.trim();
  const looksLikeTranslationKey = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/.test(
    trimmed,
  );
  const normalized = looksLikeTranslationKey
    ? (trimmed.split(".").pop() ?? trimmed)
    : trimmed;

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}
