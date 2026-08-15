import React, { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, User, Users, UserCheck, UserPlus, MessageSquare, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { socialService, type DirectoryProfile } from "@/services/social";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildCanonicalUrl } from "@/lib/seo";
import { useToast } from "@/hooks/use-toast";

function ProfileAvatar({ profile }: { profile: DirectoryProfile }) {
  return (
    <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-background">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.display_name ?? "User avatar"}
          width={56}
          height={56}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className="h-7 w-7 text-primary" />
      )}
    </div>
  );
}

function ProfileDirectoryCard({ profile }: { profile: DirectoryProfile }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwnProfile = user?.id === profile.user_id;

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, profile.user_id],
    queryFn: () => socialService.isFollowing(user!.id, profile.user_id),
    enabled: !!user?.id && !isOwnProfile,
    staleTime: 1000 * 30,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in to follow people");
      if (isFollowing) {
        await socialService.unfollowUser(user.id, profile.user_id);
      } else {
        await socialService.followUser(user.id, profile.user_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, profile.user_id] });
      queryClient.invalidateQueries({ queryKey: ["public-profile-summary", profile.user_id] });
      queryClient.invalidateQueries({ queryKey: ["public-profiles-directory"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update follow status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const favoriteCount = Array.isArray(profile.favorite_titles)
    ? profile.favorite_titles.length
    : 0;

  return (
    <article className="group relative rounded-2xl border border-border/60 bg-card/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <Link to={`/user/${profile.user_id}`} aria-label={`Open ${profile.display_name ?? "user"} profile`}>
          <ProfileAvatar profile={profile} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/user/${profile.user_id}`}
            className="block truncate text-base font-semibold hover:text-primary transition-colors"
          >
            {profile.display_name ?? "CineTrekker User"}
          </Link>
          <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground line-clamp-2">
            {profile.bio || "Building a cinematic life, one title at a time."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <strong className="font-semibold text-foreground">{profile.followers_count}</strong> followers
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          <strong className="font-semibold text-foreground">{profile.comments_count}</strong>
        </span>
        {favoriteCount > 0 && (
          <span className="ml-auto text-[10px] uppercase tracking-wide">
            {favoriteCount} favorites
          </span>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link to={`/user/${profile.user_id}`}>View profile</Link>
        </Button>
        {!isOwnProfile && (
          user ? (
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className="min-w-28 gap-1.5"
            >
              {isFollowing ? (
                <><UserCheck className="h-3.5 w-3.5" /> Following</>
              ) : (
                <><UserPlus className="h-3.5 w-3.5" /> Follow</>
              )}
            </Button>
          ) : (
            <Button asChild size="sm" className="min-w-28 gap-1.5">
              <Link to="/login"><UserPlus className="h-3.5 w-3.5" /> Follow</Link>
            </Button>
          )
        )}
      </div>
    </article>
  );
}

export default function People() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["public-profiles-directory", deferredSearch],
    queryFn: () => socialService.listPublicProfiles(deferredSearch),
    staleTime: 1000 * 60,
  });

  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.user_id !== user?.id),
    [profiles, user?.id],
  );

  return (
    <>
      <SEO
        title="People — CineTrekker"
        description="Discover public CineTrekker profiles, follow cinephiles, and explore the conversations behind their favorite films and series."
        canonical={buildCanonicalUrl("/people")}
      />
      <main className="page-container pt-24 pb-24 md:pb-12 max-w-6xl">
        <header className="max-w-2xl mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Compass className="h-3.5 w-3.5" />
            Cinephile community
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Find people with great taste.</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Browse public profiles, follow fellow cinephiles, and find the conversations behind the films and series you love.
          </p>
        </header>

        <div className="relative max-w-xl mb-8">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search public profiles…"
            className="h-11 pl-10 rounded-xl bg-card/70"
            aria-label="Search public profiles"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-52 rounded-2xl border border-border/50 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : visibleProfiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProfiles.map((profile) => (
              <ProfileDirectoryCard key={profile.user_id} profile={profile} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold">
              {search ? "No public profiles match that search" : "No public profiles to show yet"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              {search
                ? "Try a different name or clear your search."
                : "Once members make their profiles public, they will appear here for the CineTrekker community to discover."}
            </p>
            {user && (
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link to="/profile">Set up my profile</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </>
  );
}
