import { Heart, HeartOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildFollowedTitleState,
  useTitleFollows,
} from "@/hooks/useTitleFollows";
import type { MediaDetails } from "@/types/media";

interface FollowUpdatesButtonProps {
  mediaId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  details?: Pick<
    MediaDetails,
    "release_date" | "status" | "number_of_seasons" | "last_episode_to_air"
  >;
}

export function FollowUpdatesButton({
  mediaId,
  mediaType,
  title,
  posterPath,
  details,
}: FollowUpdatesButtonProps) {
  const { isFollowing, followTitle, unfollowTitle, isPending } = useTitleFollows();
  const followed = isFollowing(mediaId, mediaType);

  const handleClick = async () => {
    if (followed) {
      await unfollowTitle({ mediaId, mediaType });
      return;
    }

    await followTitle({
      mediaId,
      mediaType,
      title,
      posterPath,
      initialState: details
        ? buildFollowedTitleState(mediaType, mediaId, details)
        : undefined,
    });
  };

  return (
    <Button
      variant={followed ? "secondary" : "outline"}
      className="gap-2"
      disabled={isPending}
      onClick={handleClick}
      aria-label={followed ? "Unfollow updates" : "Follow updates"}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Updating...
        </>
      ) : followed ? (
        <>
          <HeartOff className="w-4 h-4" />
          Following
        </>
      ) : (
        <>
          <Heart className="w-4 h-4" />
          Follow Updates
        </>
      )}
    </Button>
  );
}
