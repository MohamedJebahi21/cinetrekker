import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Compass, MessageSquare, User, UserCheck, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { socialService, type DirectoryProfile } from "@/services/social";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function SuggestedAvatar({ profile }: { profile: DirectoryProfile }) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-background">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.display_name ?? "CineTrekker user avatar"}
          width={56}
          height={56}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <User className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function SuggestedPersonCard({ profile }: { profile: DirectoryProfile }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOwnProfile = user?.id === profile.user_id;

  const { data: isFollowing = false } = useQuery({
    queryKey: ["is-following", user?.id, profile.user_id],
    queryFn: () => socialService.isFollowing(user!.id, profile.user_id),
    enabled: Boolean(user?.id) && !isOwnProfile,
    staleTime: 1000 * 30,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t("social.signInToFollow", "Sign in to follow people."));
      if (isFollowing) {
        await socialService.unfollowUser(user.id, profile.user_id);
      } else {
        await socialService.followUser(user.id, profile.user_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, profile.user_id] });
      queryClient.invalidateQueries({ queryKey: ["public-profiles-directory"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile-summary", profile.user_id] });
    },
    onError: (error: Error) => {
      toast({
        title: t("social.followUpdateFailed", "Could not update follow status"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <article className="group flex min-w-[min(82vw,300px)] snap-start flex-col rounded-2xl border border-border/60 bg-background/35 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/55 sm:min-w-[300px]">
      <div className="flex items-start gap-3">
        <Link
          to={`/user/${profile.user_id}`}
          aria-label={t("home.openSuggestedProfile", {
            name: profile.display_name ?? t("social.user", "user"),
            defaultValue: `Open ${profile.display_name ?? "user"} profile`,
          })}
        >
          <SuggestedAvatar profile={profile} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/user/${profile.user_id}`}
            className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            {profile.display_name ?? t("social.cineTrekkerUser", "CineTrekker User")}
          </Link>
          <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
            {profile.bio || t("home.suggestedPersonBio", "Sharing a watchlist worth exploring.")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          <strong className="font-semibold text-foreground">{profile.followers_count}</strong>
          {t("social.followers", "followers")}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          <strong className="font-semibold text-foreground">{profile.comments_count}</strong>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline" size="sm" className="min-h-10 flex-1 rounded-xl">
          <Link to={`/user/${profile.user_id}`}>{t("home.viewProfile", "View profile")}</Link>
        </Button>
        {!isOwnProfile && (
          user ? (
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className="min-h-10 min-w-24 gap-1.5 rounded-xl"
            >
              {isFollowing ? (
                <>
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("social.following", "Following")}
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("social.follow", "Follow")}
                </>
              )}
            </Button>
          ) : (
            <Button asChild size="sm" className="min-h-10 min-w-24 gap-1.5 rounded-xl">
              <Link to="/login">
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {t("social.follow", "Follow")}
              </Link>
            </Button>
          )
        )}
      </div>
    </article>
  );
}

export function SuggestedPeopleRail() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["public-profiles-directory", "suggested"],
    queryFn: () => socialService.listPublicProfiles(""),
    staleTime: 1000 * 60,
  });

  const suggestedProfiles = useMemo(
    () =>
      profiles
        .filter((profile) => profile.user_id !== user?.id)
        .sort((left, right) => {
          const leftScore = left.followers_count * 2 + left.comments_count;
          const rightScore = right.followers_count * 2 + right.comments_count;
          return rightScore - leftScore;
        })
        .slice(0, 6),
    [profiles, user?.id],
  );

  if (!isLoading && suggestedProfiles.length === 0) return null;

  return (
    <section className="ct-panel overflow-hidden p-5 md:p-6" aria-labelledby="suggested-people-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            {t("home.communityLabel", "Cinephile community")}
          </div>
          <h2 id="suggested-people-title" className="section-title mb-1">
            {t("home.suggestedPeopleTitle", "Suggested for You")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.suggestedPeopleDesc", "Find people with great taste and make your watchlist more social.")}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="w-fit rounded-xl">
          <Link to="/people">
            {t("home.seeAllPeople", "See all people")}
            <Users className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="hide-scrollbar -mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-44 min-w-[min(82vw,300px)] snap-start animate-pulse rounded-2xl border border-border/50 bg-muted/25 sm:min-w-[300px]" />
          ))}
        </div>
      ) : (
        <div className="hide-scrollbar -mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
          {suggestedProfiles.map((profile) => (
            <SuggestedPersonCard key={profile.user_id} profile={profile} />
          ))}
        </div>
      )}
    </section>
  );
}

export default SuggestedPeopleRail;
