import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createLogger } from "@/lib/logger";
import type { PostgrestError } from "@supabase/supabase-js";

const logger = createLogger("collections");

export interface Collection {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  items: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  collection_id: number;
  media_id: number;
  media_type: "movie" | "tv";
  added_at: string;
}

export type CollectionsFetchStatus = "idle" | "ok" | "schema_missing" | "network_error";

interface CollectionsQueryResult {
  items: Collection[];
  fetchStatus: CollectionsFetchStatus;
}

function isMissingCollectionsSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const typedError = error as PostgrestError;
  return (
    typedError.code === "PGRST205" ||
    typedError.message?.toLowerCase().includes("could not find the table") === true
  );
}

function normalizeCollection(value: unknown): Collection | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "number" ? row.id : Number(row.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (typeof row.user_id !== "string" || typeof row.name !== "string") return null;

  return {
    id,
    user_id: row.user_id,
    name: row.name,
    description: typeof row.description === "string" ? row.description : null,
    items: Array.isArray(row.items) ? row.items : [],
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date(0).toISOString(),
  };
}

export const useCollections = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["collections", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CollectionsQueryResult> => {
      if (!user) return { items: [], fetchStatus: "idle" };

      try {
        const { data, error } = await supabase
          .from("collections")
          .select("id, name, description, created_at, updated_at, user_id, items")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          if (isMissingCollectionsSchema(error)) {
            logger.warn("Collections table missing in Supabase; returning empty list.");
            return { items: [], fetchStatus: "schema_missing" };
          }
          logger.error("Failed to fetch collections", error);
          return { items: [], fetchStatus: "network_error" };
        }

        return {
          items: (Array.isArray(data) ? data : [])
            .map(normalizeCollection)
            .filter((item): item is Collection => item !== null),
          fetchStatus: "ok",
        };
      } catch (error) {
        logger.error("Network error fetching collections", error);
        return { items: [], fetchStatus: "network_error" };
      }
    },
    select: (result) => ({
      data: result.items,
      fetchStatus: result.fetchStatus,
    }),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const name = input.name.trim();
      if (!name) throw new Error("Collection name is required");

      const { data, error } = await supabase
        .from("collections")
        .insert({
          user_id: user.id,
          name,
          description: input.description?.trim() || null,
          items: [],
        })
        .select()
        .single();

      if (error) throw error;
      return normalizeCollection(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections", user?.id] });
      toast({ title: "Collection created", description: "Your new curation space is ready." });
    },
    onError: (error) => {
      logger.error("Create collection failed", error);
      toast({ title: "Could not create collection", description: "Please try again.", variant: "destructive" });
    },
  });
};

export const useUpdateCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { id: number; name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const name = input.name.trim();
      if (!name) throw new Error("Collection name is required");

      const { data, error } = await supabase
        .from("collections")
        .update({ name, description: input.description?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return normalizeCollection(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections", user?.id] });
      toast({ title: "Collection updated" });
    },
    onError: (error) => {
      logger.error("Update collection failed", error);
      toast({ title: "Could not update collection", description: "Please try again.", variant: "destructive" });
    },
  });
};

export const useDeleteCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (collectionId: number) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId)
        .eq("user_id", user.id);
      if (error) throw error;
      return collectionId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections", user?.id] });
      toast({ title: "Collection deleted" });
    },
    onError: (error) => {
      logger.error("Delete collection failed", error);
      toast({ title: "Could not delete collection", description: "Please try again.", variant: "destructive" });
    },
  });
};

export const useAddToCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { collection_id: number; media_id: number; media_type: "movie" | "tv" }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("collection_items")
        .upsert(
          {
            collection_id: params.collection_id,
            media_id: params.media_id,
            media_type: params.media_type,
            added_at: new Date().toISOString(),
          },
          { onConflict: "collection_id,media_id,media_type" },
        );
      if (error) throw error;
      return params;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["collectionItems"] });
      toast({ title: "Added to collection" });
    },
    onError: (error) => {
      logger.error("Add to collection failed", error);
      toast({ title: "Could not add title", description: "Please try again.", variant: "destructive" });
    },
  });
};

export const useRemoveFromCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { collection_id: number; media_id: number; media_type: "movie" | "tv" }) => {
      const { error } = await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", params.collection_id)
        .eq("media_id", params.media_id)
        .eq("media_type", params.media_type);
      if (error) throw error;
      return params;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["collectionItems"] });
      toast({ title: "Removed from collection" });
    },
    onError: (error) => {
      logger.error("Remove from collection failed", error);
      toast({ title: "Could not remove title", description: "Please try again.", variant: "destructive" });
    },
  });
};

export const useCollectionItems = (collectionId?: number) =>
  useQuery({
    queryKey: ["collectionItems", collectionId],
    enabled: !!collectionId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<CollectionItem[]> => {
      if (!collectionId) return [];
      try {
        const { data, error } = await supabase
          .from("collection_items")
          .select("collection_id, media_id, media_type, added_at")
          .eq("collection_id", collectionId)
          .order("added_at", { ascending: false });

        if (error) {
          logger.error("Failed to fetch collection items", error);
          return [];
        }

        return (Array.isArray(data) ? data : []).filter(
          (item): item is CollectionItem =>
            typeof item.media_id === "number" &&
            (item.media_type === "movie" || item.media_type === "tv"),
        );
      } catch (error) {
        logger.error("Network error fetching collection items", error);
        return [];
      }
    },
  });

export default useCollections;
