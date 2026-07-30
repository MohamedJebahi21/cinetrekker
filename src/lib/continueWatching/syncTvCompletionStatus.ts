import { supabase } from "@/integrations/supabase/client";

export async function syncTvCompletionStatuses(params: {
  userId: string;
  toComplete: number[];
  toReopen: number[];
}): Promise<void> {
  const { userId, toComplete, toReopen } = params;
  if (toComplete.length === 0 && toReopen.length === 0) return;

  const watchedAt = new Date().toISOString();
  const updates = [
    ...toComplete.map((mediaId) => ({
      user_id: userId,
      media_id: mediaId,
      media_type: "tv" as const,
      status: "completed" as const,
      watched_at: watchedAt,
    })),
    ...toReopen.map((mediaId) => ({
      user_id: userId,
      media_id: mediaId,
      media_type: "tv" as const,
      status: "watching" as const,
      watched_at: watchedAt,
    })),
  ];

  const { error } = await supabase
    .from("user_watched")
    .upsert(updates, { onConflict: "user_id,media_id,media_type" });

  if (error) throw error;
}
