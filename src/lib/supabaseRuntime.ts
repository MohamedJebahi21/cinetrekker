import { logger } from "@/lib/logger";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error || "");
}

export function isSupabaseNetworkIssue(error: unknown): boolean {
  const message = toMessage(error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("err_name_not_resolved") ||
    message.includes("dns") ||
    message.includes("offline")
  );
}

export function logSupabaseIssue(scope: string, error: unknown): void {
  if (isSupabaseNetworkIssue(error)) {
    logger.warn(`[Supabase] ${scope} fallback`, error);
    return;
  }

  logger.error(`[Supabase] ${scope}`, error);
}
