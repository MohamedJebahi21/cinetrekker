
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Heart, Calendar, Film, Tv, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { profileService, type UserProfile } from "@/services/profile";
import { socialService } from "@/services/social";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import type { UserMediaItem } from "@/types/media";

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { watched } = useUserLists();
  const isOwnProfile = !!user?.id && user.id === userId;

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      return await socialService.getUserProfileByUserId(userId);
    },
    enabled: !!userId,
  });

  const { data: isFollowing, isLoading: isLoadingFollowStatus } = useQuery({
    queryKey: ["is-following", user?.id, userId],
    queryFn: async () => {
      if (!userId || !user?.id || user.id === userId) return false;
      return await socialService.isFollowing(user.id, userId);
    },
    enabled: !!userId && !!user?.id && user.id !== userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !user?.id) throw new Error("User not logged in or target not found");
      if (isFollowing) {
        await socialService.unfollowUser(user.id, userId);
      } else {
        await socialService.followUser(user.id, userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
    },
  });

  type WatchedEntry = UserMediaItem & {
    posterPath?: string | null;
  };

  const uniqueWatchedEntries = useMemo(() => {
    // `watched` comes from the logged-in session (useUserLists), and RLS on
    // user_watched only allows `auth.uid() = user_id`, so another user's rows
    // are unreachable from the client. Only surface this data on your own
    // profile — otherwise we'd be showing the viewer's list on someone else's page.
    if (!isOwnProfile) return [] as WatchedEntry[];
    const map = new Map<string, WatchedEntry>();
    watched.forEach((item) => {
      const key = `${item.mediaType}-${item.mediaId}`;
      if (!map.has(key)) map.set(key, item as WatchedEntry);
    });
    return Array.from(map.values());
  }, [watched, isOwnProfile]);

  if (!userId) return null;

  if (isLoadingProfile) {
    return (
      <div className="page-container pt-24 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container pt-24">
        <div className="text-center py-20">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
          <p className="text-muted-foreground">
            The profile you're looking for doesn't exist or is private
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const stats = {
    watchedCount: uniqueWatchedEntries.length,
    moviesWatched: uniqueWatchedEntries.filter(
      (i) => i.mediaType === "movie",
    ).length,
    tvWatched: uniqueWatchedEntries.filter((i) => i.mediaType === "tv").length,
  };

  return (
    <>
      <SEO
        title={profile.display_name || "User Profile"}
        description={profile.bio || "CineTrekker profile"}
      />
      <div className="page-container pt-24 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <div className="sticky top-24">
              <div className="border border-border rounded-2xl overflow-hidden bg-card p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name || "User avatar"}
                        width={120}
                        height={120}
                        className="w-30 h-30 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-30 h-30 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <User className="h-14 w-14 text-primary" />
                      </div>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold mb-1">
                    {profile.display_name || "CineTrekker User"}
                  </h1>

                  {profile.bio && (
                    <p className="text-muted-foreground mb-4">{profile.bio}</p>
                  )}

                  <div className="w-full space-y-3">
                    {!isOwnProfile && user && (
                      <Button
                        className="w-full"
                        onClick={() => followMutation.mutate()}
                        disabled={followMutation.isPending}
                      >
                        {isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                    )}

                    {isOwnProfile && (
                      <Button asChild className="w-full" variant="secondary">
                        <Link to="/profile">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="w-full grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-border">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {isOwnProfile ? stats.watchedCount : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Watched
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {isOwnProfile ? stats.moviesWatched : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Movies
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {isOwnProfile ? stats.tvWatched : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Series
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-primary" />
                  Recently Watched
                </h2>

                {uniqueWatchedEntries.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {uniqueWatchedEntries.slice(0, 8).map((item) => {
                      const watchedItem = item as WatchedEntry;
                      const title = getMediaTitle({
                        id: item.mediaId,
                        media_type: item.mediaType,
                        title: "",
                        name: "",
                      } as Parameters<typeof getMediaTitle>[0]);
                      const posterUrl = getImageUrl(watchedItem.posterPath ?? null, "w342");
                      return (
                        <Link
                          key={`${item.mediaType}-${item.mediaId}`}
                          to={`/${item.mediaType}/${item.mediaId}`}
                          className="group"
                        >
                          <div className="aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted">
                            {posterUrl ? (
                              <Image
                                src={posterUrl}
                                alt={title}
                                width={342}
                                height={513}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                {item.mediaType === "movie" ? (
                                  <Film className="h-10 w-10 text-muted-foreground" />
                                ) : (
                                  <Tv className="h-10 w-10 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <h3 className="text-sm font-medium line-clamp-2">
                              {title}
                            </h3>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center">
                    {isOwnProfile
                      ? "No watched items yet"
                      : "This user's watched activity isn't public"}
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
