import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovieFollowers } from "@/hooks/useMovieFollowers";

interface FollowUpdatesButtonProps {
  mediaId: number;
  mediaType: "movie" | "tv";
}

export function FollowUpdatesButton({ mediaId, mediaType }: FollowUpdatesButtonProps) {
  const { isFollowing, follow, unfollow, isFollowingPending } = useMovieFollowers();
  const movieKey = `${mediaType}-${mediaId}`;
  const followed = isFollowing(movieKey);

  const handleClick = () => {
    if (followed) {
      unfollow(movieKey);
      return;
    }
    follow(movieKey);
  };

  return (
    <Button
      variant={followed ? "secondary" : "outline"}
      className="gap-2"
      disabled={isFollowingPending}
      onClick={handleClick}
      aria-label={followed ? "Unfollow updates" : "Follow updates"}
    >
      {isFollowingPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </>
      ) : followed ? (
        "Following ✓"
      ) : (
        "Follow Updates"
      )}
    </Button>
  );
}
