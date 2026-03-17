import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieRatingProps {
  rating: number | null | undefined;
  vote_count?: number | null;
}

const STAR_COUNT = 5;

function isMissingRating(rating: number | null | undefined) {
  return rating == null || !Number.isFinite(rating) || rating <= 0;
}

function getFilledStars(rating: number) {
  return Math.round((Math.max(0, Math.min(10, rating)) / 10) * STAR_COUNT);
}

function formatVoteCount(voteCount: number | null | undefined) {
  const safeVoteCount =
    typeof voteCount === "number" && Number.isFinite(voteCount) && voteCount > 0
      ? voteCount
      : 0;

  return new Intl.NumberFormat("en-US").format(safeVoteCount);
}

export function MovieRating({ rating, vote_count }: MovieRatingProps) {
  const missingRating = isMissingRating(rating);
  const safeRating = missingRating ? null : Number(rating);
  const filledStars = safeRating == null ? 0 : getFilledStars(safeRating);
  const formattedVoteCount = formatVoteCount(vote_count);

  return (
    <div
      className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
      aria-label={
        safeRating == null
          ? `Rating unavailable, ${formattedVoteCount} votes`
          : `Rated ${safeRating.toFixed(1)} out of 10 from ${formattedVoteCount} votes`
      }
    >
      <div
        className="flex items-center gap-0.5 text-amber-400"
        aria-hidden="true"
      >
        {Array.from({ length: STAR_COUNT }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "h-4 w-4 transition-colors",
              index < filledStars
                ? "fill-current text-amber-400"
                : "fill-none text-muted-foreground/40",
            )}
          />
        ))}
      </div>

      <span className="tabular-nums text-foreground">
        {safeRating == null ? "—" : safeRating.toFixed(1)}
      </span>

      <span className="text-muted-foreground tabular-nums">
        ({formattedVoteCount})
      </span>
    </div>
  );
}
