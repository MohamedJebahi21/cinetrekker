export function stripWrappingDoubleQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function toDisplayTitle(value: string | null | undefined): string {
  if (!value) return "Untitled";
  return stripWrappingDoubleQuotes(value);
}
