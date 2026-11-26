import { useTranslation } from "react-i18next";
import { Loader2, PlayCircle } from "lucide-react";
import { AsyncSectionMessage } from "@/components/AsyncSectionMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface DetailsEpisodeSummary {
  id: number;
  episode_number: number;
  name: string;
  air_date?: string | null;
  runtime?: number | null;
}

export interface DetailsEpisodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  seasons: number[];
  selectedSeason: number | null;
  onSelectSeason: (season: number | null) => void;
  seasonDetails?: {
    episodes?: DetailsEpisodeSummary[];
  } | null;
  seasonLoading: boolean;
  seasonError: boolean;
  seasonLoadingTimedOut: boolean;
  onRetrySeasonDetails: () => void;
  mediaId: number;
  isEpisodeWatched: (mediaId: number, seasonNumber: number, episodeNumber: number) => boolean;
  onToggleEpisode: (
    seasonNumber: number,
    episodeNumber: number,
    episodeName: string,
    airDate: string | null,
  ) => void;
  language: string;
}

export function DetailsEpisodesDialog({
  open,
  onOpenChange,
  title,
  seasons,
  selectedSeason,
  onSelectSeason,
  seasonDetails,
  seasonLoading,
  seasonError,
  seasonLoadingTimedOut,
  onRetrySeasonDetails,
  mediaId,
  isEpisodeWatched,
  onToggleEpisode,
  language,
}: DetailsEpisodesDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl">
          <PlayCircle className="w-4 h-4" />
          {t("episodes.allEpisodes")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("episodes.allEpisodes")} — {title}
          </DialogTitle>
          <DialogDescription>
            {t("tv.selectEpisodes", "Select the episodes you have watched")}
          </DialogDescription>
        </DialogHeader>
        <Accordion
          type="single"
          collapsible
          className="w-full"
          onValueChange={(v) => onSelectSeason(v ? parseInt(v, 10) : null)}
        >
          {seasons.map((n) => (
            <AccordionItem key={n} value={n.toString()}>
              <AccordionTrigger className="md:hover:no-underline">
                {t("episodes.season")} {n}
              </AccordionTrigger>
              <AccordionContent>
                {selectedSeason === n && seasonDetails?.episodes ? (
                  <div className="space-y-2">
                    {seasonDetails.episodes.map((ep) => {
                      const ew = isEpisodeWatched(mediaId, n, ep.episode_number);
                      return (
                        <div
                          key={ep.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl transition-colors",
                            ew ? "bg-muted/50" : "md:hover:bg-muted/30",
                          )}
                        >
                          <Checkbox
                            checked={ew}
                            onCheckedChange={() =>
                              onToggleEpisode(n, ep.episode_number, ep.name, ep.air_date ?? null)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">E{ep.episode_number}</span>
                              <span className={cn("text-sm", ew && "line-through opacity-60")}>
                                {ep.name}
                              </span>
                            </div>
                            {ep.air_date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(ep.air_date).toLocaleDateString(language)}
                              </span>
                            )}
                          </div>
                          {ep.runtime && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {ep.runtime} {t("details.minutes")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : !selectedSeason ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    {t(
                      "details.selectSeasonPrompt",
                      "Choose a season from the dropdown to browse episodes.",
                    )}
                  </p>
                ) : seasonError || seasonLoadingTimedOut ? (
                  <AsyncSectionMessage
                    title={t("common.error", "An error occurred")}
                    description={t(
                      "details.seasonLoadError",
                      "Season episodes could not be loaded.",
                    )}
                    onRetry={onRetrySeasonDetails}
                  />
                ) : seasonLoading ? (
                  <div
                    className="flex min-h-16 items-center justify-center gap-2 py-4 text-muted-foreground text-sm"
                    role="status"
                    aria-busy="true"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("details.loadingSeasonEpisodes", "Loading season episodes...")}
                  </div>
                ) : (
                  <AsyncSectionMessage
                    title={t("common.error", "An error occurred")}
                    description={t(
                      "details.seasonUnavailable",
                      "Season episode details are unavailable right now.",
                    )}
                    onRetry={onRetrySeasonDetails}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
