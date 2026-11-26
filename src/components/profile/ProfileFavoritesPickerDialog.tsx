import { Check, Film, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Image } from "@/components/ui/Image";
import { Input } from "@/components/ui/input";
import { getImageUrl } from "@/services/tmdb";

type FavoriteSearchResult = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  year: string;
};

interface ProfileFavoritesPickerDialogProps {
  /** Controls dialog open state. */
  open: boolean;
  /** Called when the dialog requests an open/close state change. Profile.tsx resets search query when open becomes false. */
  onOpenChange: (open: boolean) => void;
  /** Current search input value (controlled). */
  favoriteSearchQuery: string;
  /** Called on search input change. */
  onSearchQueryChange: (value: string) => void;
  /** Trimmed search query — drives empty/loading/results display. */
  favoriteSearchTerm: string;
  /** Search type filter (all / movie / tv). */
  favoriteSearchType: "all" | "movie" | "tv";
  /** Resolved search results from Profile.tsx's useQuery. */
  favoriteSearchResults: FavoriteSearchResult[];
  /** Whether the TMDB query is fetching. */
  isSearchingFavorites: boolean;
  /** Pinned favorite keys for isPinned detection. */
  pinnedFavoriteKeys: string[];
  /** Called when the user pins a new favorite. */
  onPin: (mediaId: number, mediaType: "movie" | "tv", title: string) => void;
  /** Called when the user wants to remove a pinned favorite (triggers Candidate A dialog). */
  onRequestRemoval: (mediaId: number, mediaType: "movie" | "tv", title: string) => void;
  /** i18n text helper. */
  text: (key: string, fallback: string) => string;
}

/**
 * Search-and-pin dialog for choosing favorite movies or TV series on the user's profile.
 */
export function ProfileFavoritesPickerDialog({
  open,
  onOpenChange,
  favoriteSearchQuery,
  onSearchQueryChange,
  favoriteSearchTerm,
  favoriteSearchType,
  favoriteSearchResults,
  isSearchingFavorites,
  pinnedFavoriteKeys,
  onPin,
  onRequestRemoval,
  text,
}: ProfileFavoritesPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-border bg-card p-0 text-foreground shadow-md sm:rounded-xl"
        aria-describedby="favorites-picker-description"
      >
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              {favoriteSearchType === "movie" ? (
                <Film className="h-4.5 w-4.5" />
              ) : (
                <Sparkles className="h-4.5 w-4.5" />
              )}
            </span>
            {favoriteSearchType === "movie"
              ? text("profile.chooseFavoriteMovies", "Choose Favorite Movies")
              : text("profile.chooseFavoriteSeries", "Choose Favorite Series")}
          </DialogTitle>
          <DialogDescription
            id="favorites-picker-description"
            className="max-w-2xl text-xs text-muted-foreground leading-relaxed"
          >
            {text(
              "profile.favoritesPickerDesc",
              "Search TMDB and pin the titles that define your taste. Favorites are saved to your profile shelf right away.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              value={favoriteSearchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={
                favoriteSearchType === "movie"
                  ? text("profile.searchMovies", "Search movies")
                  : text("profile.searchSeries", "Search TV series")
              }
              className="h-12 rounded-lg border-border/80 bg-background/50 pl-11 pr-4 text-sm"
              autoFocus
            />
          </div>

          {favoriteSearchTerm.length < 2 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                {text("profile.startTypingToSearch", "Start typing to search")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {text("profile.enterTwoChars", "Enter at least 2 characters to find")}{" "}
                {favoriteSearchType === "movie"
                  ? text("common.movies", "movies")
                  : text("common.tvShows", "series")}
                .
              </p>
            </div>
          ) : isSearchingFavorites ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`favorite-picker-skeleton-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="h-16 w-12 rounded-md skeleton-shimmer" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                  </div>
                  <div className="h-9 w-20 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : favoriteSearchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                {text("profile.noMatchesFound", "No matches found")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {text("profile.tryDifferentSearch", "Try a different title, year, or spelling.")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {favoriteSearchResults.map((result) => {
                const key = `${result.mediaType}-${result.id}`;
                const isPinned = pinnedFavoriteKeys.includes(key);

                return (
                  <div
                    key={key}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-150 hover:bg-accent/40"
                  >
                    <Image
                      src={getImageUrl(result.posterPath, "w154")}
                      srcSet={`${getImageUrl(result.posterPath, "w92")} 92w, ${getImageUrl(result.posterPath, "w154")} 154w, ${getImageUrl(result.posterPath, "w342")} 342w`}
                      sizes="48px"
                      alt={result.title}
                      width={154}
                      height={231}
                      className="h-16 w-12 shrink-0 rounded object-cover shadow-sm"
                      loading="lazy"
                      showSkeleton
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                        {result.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {result.mediaType === "movie"
                          ? text("watchHistory.mediaTypeMovie", "Movie")
                          : text("profile.series", "Series")}
                        {result.year ? ` • ${result.year}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isPinned ? "secondary" : "outline"}
                      className="min-w-[80px]"
                      onClick={() =>
                        isPinned
                          ? onRequestRemoval(
                              result.id,
                              result.mediaType,
                              result.title,
                            )
                          : onPin(
                              result.id,
                              result.mediaType,
                              result.title,
                            )
                      }
                    >
                      {isPinned ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          {text("profile.pinned", "Pinned")}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {text("profile.add", "Add")}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
