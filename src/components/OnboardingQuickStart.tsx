import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, UploadCloud, Check, Plus, Film, Tv, X, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserLists } from "@/contexts/UserListsContext";
import { useAuth } from "@/contexts/AuthContext";
import { LibraryImporterDialog } from "@/components/LibraryImporterDialog";
import { trackProductEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const ONBOARDING_QUICKSTART_KEY = "cinetrekker_onboarding_quickstart_dismissed";

interface StarterTitle {
  id: number;
  title: string;
  type: "movie" | "tv";
  year: string;
  poster: string;
}

const STARTER_TITLES: StarterTitle[] = [
  { id: 157336, title: "Interstellar", type: "movie", year: "2014", poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: 27205, title: "Inception", type: "movie", year: "2010", poster: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { id: 155, title: "The Dark Knight", type: "movie", year: "2008", poster: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: 693134, title: "Dune: Part Two", type: "movie", year: "2024", poster: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: 1396, title: "Breaking Bad", type: "tv", year: "2008", poster: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg" },
  { id: 66732, title: "Stranger Things", type: "tv", year: "2016", poster: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg" },
  { id: 100088, title: "The Last of Us", type: "tv", year: "2023", poster: "/uKvVjK1q1NVx4G2Z378L1Rkm164.jpg" },
  { id: 129, title: "Spirited Away", type: "movie", year: "2001", poster: "/39wmItIWsg5sZMyRUHLkWBcuVqa.jpg" },
  { id: 76600, title: "Avatar: The Way of Water", type: "movie", year: "2022", poster: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  { id: 94605, title: "Arcane", type: "tv", year: "2021", poster: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg" },
  { id: 46648, title: "True Detective", type: "tv", year: "2014", poster: "/cuV2O52338nmyi2UQ5nYuP5oW5x.jpg" },
  { id: 872585, title: "Oppenheimer", type: "movie", year: "2023", poster: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
];

export function OnboardingQuickStart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched, addToWatched } = useUserLists();

  const [isOpen, setIsOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(ONBOARDING_QUICKSTART_KEY);
    // Trigger only if user has an empty library and hasn't dismissed yet
    const isEmptyLibrary = watchlist.length === 0 && watched.length === 0;
    if (!dismissed && isEmptyLibrary) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        trackProductEvent("onboarding_quickstart_viewed", {
          is_authenticated: user ? "yes" : "no",
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [watchlist.length, watched.length, user]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_QUICKSTART_KEY, "true");
    setIsOpen(false);
  };

  const togglePick = (item: StarterTitle) => {
    const next = new Set(selectedIds);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
      void addToWatched(item.id, item.type, 9);
      trackProductEvent("onboarding_title_picked", {
        media_id: String(item.id),
        media_type: item.type,
      });
    }
    setSelectedIds(next);
  };

  const handleComplete = () => {
    trackProductEvent("onboarding_quickstart_completed", {
      titles_selected: String(selectedIds.size),
    });
    handleDismiss();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/60 max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-4 w-4" />
              {t("onboarding.quickstartEyebrow", "Quick Start")}
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {t("onboarding.quickstartTitle", "Welcome to CineTrekker")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t(
                "onboarding.quickstartDesc",
                "Your library is empty. Bring over your tracking history or tap a few favorites you love to calibrate recommendations."
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Import Card */}
          <div className="my-2 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("onboarding.importOptionTitle", "Already use Letterboxd or Trakt?")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.importOptionDesc", "Import your watched, ratings, and watchlist CSV files in seconds.")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 shrink-0 w-full sm:w-auto"
              onClick={() => {
                setIsOpen(false);
                setIsImporterOpen(true);
              }}
            >
              {t("onboarding.importAction", "Import Library")}
            </Button>
          </div>

          {/* Quick Pick Starter Titles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("onboarding.pickFavorites", "Or tap titles you have watched")}
              </h4>
              <span className="text-xs font-semibold text-primary">
                {selectedIds.size} {t("onboarding.selectedCount", "selected")}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {STARTER_TITLES.map((title) => {
                const isSelected = selectedIds.has(title.id);
                return (
                  <button
                    key={title.id}
                    type="button"
                    onClick={() => togglePick(title)}
                    className={cn(
                      "group relative aspect-[2/3] rounded-lg overflow-hidden border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary",
                      isSelected
                        ? "border-primary ring-2 ring-primary scale-[0.98]"
                        : "border-border/50 hover:border-foreground/30 hover:scale-[1.02]"
                    )}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w300${title.poster}`}
                      alt={title.title}
                      className={cn(
                        "w-full h-full object-cover transition-opacity",
                        isSelected ? "opacity-60" : "opacity-90 group-hover:opacity-100"
                      )}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5">
                      <p className="text-[11px] font-bold text-white line-clamp-1">{title.title}</p>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-300">
                        {title.type === "movie" ? <Film className="h-2.5 w-2.5" /> : <Tv className="h-2.5 w-2.5" />}
                        <span>{title.year}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md animate-scale-in">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground text-xs">
              {t("common.skip", "I'll explore first")}
            </Button>
            <Button size="sm" onClick={handleComplete} className="gap-1.5">
              <span>{t("common.done", "Done")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Controlled Importer Dialog */}
      <LibraryImporterDialog
        open={isImporterOpen}
        onOpenChange={(open) => {
          setIsImporterOpen(open);
          if (!open) handleDismiss();
        }}
      />
    </>
  );
}
