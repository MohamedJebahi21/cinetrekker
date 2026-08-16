import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Clock3,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import {
  socialService,
  type PublicProfileComment,
  type PublicProfileSummary,
} from "@/services/social";
import { getImageUrl, getMediaTitle, getMovieDetails, getTVDetails } from "@/services/tmdb";
import type { MediaDetails } from "@/types/media";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";

interface ActivityItem {
  comment: PublicProfileComment;
  profile: PublicProfileSummary;
  title: string;
  posterPath: string | null;
}

function getProfileInitials(profile: PublicProfileSummary) {
  const name = profile.display_name?.trim() || "CineTrekker User";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

async function loadCommunityActivity(userId: string, language: string): Promise<ActivityItem[]> {
  const following = await socialService.getFollowing(userId);
  const followingIds = Array.from(
    new Set(following.map((follow) => follow.following_id).filter(Boolean)),
  ).slice(0, 8);

  if (followingIds.length === 0) return [];

  const profileActivity = await Promise.all(
    followingIds.map(async (followingId) => {
      const [profile, comments] = await Promise.all([
        socialService.getPublicProfileSummary(followingId),
        socialService.getPublicProfileComments(followingId),
      ]);

      if (!profile || !profile.is_public) return [] as ActivityItem[];

      return comments.slice(0, 4).map((comment) => ({
        comment,
        profile,
        title: `${comment.media_type === "tv" ? "TV" : "Movie"} #${comment.media_id}`,
        posterPath: null,
      }));
    }),
  );

  const candidates = profileActivity
    .flat()
    .sort(
      (left, right) =>
        new Date(right.comment.created_at).getTime() -
        new Date(left.comment.created_at).getTime(),
    )
    .slice(0, 12);

  const enriched = await Promise.all(
    candidates.map(async (item) => {
      try {
        const details: MediaDetails =
          item.comment.media_type === "movie"
            ? await getMovieDetails(item.comment.media_id, language)
            : await getTVDetails(item.comment.media_id, language);

        return {
          ...item,
          title: getMediaTitle(details) || item.title,
          posterPath: details.poster_path,
        };
      } catch {
        return item;
      }
    }),
  );

  return enriched;
}

function CommunityFeedSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="min-h-[154px] rounded-2xl border border-border/50 bg-background/35 p-4"
        >
          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full skeleton-shimmer" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-32 rounded skeleton-shimmer" />
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="mt-4 h-10 w-full rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommunityActivityFeed() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const activityQuery = useQuery({
    queryKey: ["home-community-feed", user?.id, i18n.language],
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    queryFn: () => loadCommunityActivity(user!.id, i18n.language),
  });

  const items = activityQuery.data ?? [];

  return (
    <section
      className="ct-panel relative overflow-hidden p-5 md:p-6"
      aria-labelledby="community-activity-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-amber-400/8 blur-3xl"
      />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400/90">
              <Users className="h-4 w-4" aria-hidden="true" />
              {t("home.communityPulseEyebrow", "Community pulse")}
            </div>
            <h2 id="community-activity-title" className="section-title mb-1">
              {t("home.communityPulseTitle", "Fresh from people you follow")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "home.communityPulseDescription",
                "See the conversations and discoveries making your circle move today.",
              )}
            </p>
          </div>
          <Link
            to="/people"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/35 px-3.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("home.explorePeople", "Explore people")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {activityQuery.isLoading ? (
          <CommunityFeedSkeleton />
        ) : activityQuery.isError ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("home.communityPulseErrorTitle", "The community pulse is unavailable")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("home.communityPulseErrorDescription", "Try refreshing to load recent activity.")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void activityQuery.refetch()}
              className="min-h-10 gap-2 rounded-xl bg-background/45"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("common.retry", "Try again")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/12 text-amber-400">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("home.communityPulseEmptyTitle", "Your circle is quiet for now")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t(
                    "home.communityPulseEmptyBody",
                    "Follow a few cinephiles to see their comments and discoveries here.",
                  )}
                </p>
              </div>
            </div>
            <Link
              to="/people"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-semibold text-black transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {t("home.findCinephiles", "Find cinephiles")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.slice(0, 6).map((item) => {
              const profileName = item.profile.display_name || t("common.user", "CineTrekker User");
              const mediaPath = `/${item.comment.media_type}/${item.comment.media_id}`;

              return (
                <article
                  key={item.comment.id}
                  className="group rounded-2xl border border-border/60 bg-background/30 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-amber-400/25 hover:bg-background/50"
                >
                  <div className="flex items-start gap-3">
                    <Link
                      to={`/user/${item.profile.user_id}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-primary/10 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={t("home.openProfile", "Open {{name}} profile", { name: profileName })}
                    >
                      {item.profile.avatar_url ? (
                        <Image
                          src={item.profile.avatar_url}
                          alt=""
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        getProfileInitials(item.profile)
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          to={`/user/${item.profile.user_id}`}
                          className="truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {profileName}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {t("home.commentedOn", "commented on")}
                        </span>
                        <Link to={mediaPath} className="truncate text-xs font-semibold text-primary hover:text-primary/80">
                          {item.title}
                        </Link>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {formatDistanceToNow(new Date(item.comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={mediaPath}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={t("home.openConversation", "Open conversation")}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                  <p className="mt-3 line-clamp-2 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 text-sm leading-5 text-muted-foreground">
                    {item.comment.contains_spoiler
                      ? t("home.spoilerCommentHidden", "Spoiler comment — open the title to reveal it")
                      : item.comment.content}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {item.comment.likes_count > 0
                        ? t("home.commentLikes", "{{count}} likes", { count: item.comment.likes_count })
                        : t("home.startConversation", "Start the conversation")}
                    </span>
                    <Link to={mediaPath} className="font-semibold text-primary hover:text-primary/80">
                      {t("home.joinConversation", "Join conversation")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
