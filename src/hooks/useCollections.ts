import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

export const useCollections = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['collections', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('id, name, description, created_at, updated_at, user_id, items')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          const errorCode = (error as Record<string, unknown>).code as string | undefined;
          const errorMessage = (error as Record<string, unknown>).message as string | undefined;
          if (errorCode === 'PGRST205' || errorMessage?.includes("Could not find the table")) {
            console.warn('Collections table missing in Supabase; returning empty list.');
            return [];
          }
          console.error('Failed to fetch collections', error);
          return [];
        }

        return data || [];
      } catch (err) {
        console.error('Network error fetching collections', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] }),
    onError: (err) => {
      console.error('Create collection failed', err);
      toast({ title: 'Error creating collection', variant: 'destructive' });
    }
  });
};

export const useAddToCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { collection_id: number; media_id: number; media_type: 'movie' | 'tv' }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('collection_items')
        .upsert({ collection_id: params.collection_id, media_id: params.media_id, media_type: params.media_type, added_at: new Date().toISOString() }, { onConflict: 'collection_id,media_id,media_type' });
      if (error) throw error;
      return params;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({ title: 'Added to collection' });
    },
    onError: (err) => {
      console.error('Add to collection failed', err);
      toast({ title: 'Error adding to collection', variant: 'destructive' });
    }
  });
};

export const useRemoveFromCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { collection_id: number; media_id: number; media_type: 'movie' | 'tv' }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', params.collection_id)
        .eq('media_id', params.media_id)
        .eq('media_type', params.media_type);
      if (error) throw error;
      return params;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({ title: 'Removed from collection' });
    },
    onError: (err) => {
      console.error('Remove from collection failed', err);
      toast({ title: 'Error removing from collection', variant: 'destructive' });
    }
  });
};

export const useCollectionItems = (collectionId?: number) => {
  return useQuery({
    queryKey: ['collectionItems', collectionId],
    queryFn: async () => {
      if (!collectionId) return [];
      try {
        const { data, error } = await supabase
          .from('collection_items')
          .select('media_id, media_type')
          .eq('collection_id', collectionId);

        if (error) {
          console.error('Failed to fetch collection items', error);
          return [];
        }

        return (data || []).map((d: { media_id: number; media_type: string }) => ({ mediaId: d.media_id, mediaType: d.media_type }));
      } catch (err) {
        console.error('Network error fetching collection items', err);
        return [];
      }
    },
    enabled: !!collectionId,
    staleTime: 1000 * 60 * 5,
  });
};

export default useCollections;
