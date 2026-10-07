import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";
import { parseImportFile, type ParsedImportItem, type ImportParseResult } from "@/lib/importers/csvParser";
import { useUserLists } from "@/contexts/UserListsContext";
import { searchMovies, searchTV } from "@/services/tmdb";
import { toast } from "sonner";

interface LibraryImporterDialogProps {
  children?: React.ReactNode;
}

export function LibraryImporterDialog({ children }: LibraryImporterDialogProps) {
  const { t } = useTranslation();
  const { addToWatched, addToWatchlist } = useUserLists();

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setIsImporting(false);
    setProgress(0);
    setImportStats(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseImportFile(content, selected.name);
        setParseResult(result);
      }
    };
    reader.readAsText(selected);
  };

  const runImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    let successCount = 0;
    let failedCount = 0;
    const total = parseResult.items.length;

    // Process items in chunks to avoid overwhelming TMDB / Supabase
    for (let i = 0; i < total; i++) {
      const item = parseResult.items[i];
      try {
        let tmdbId = item.tmdbId;

        if (!tmdbId) {
          // Resolve TMDB ID via search
          if (item.mediaType === "tv") {
            const searchRes = await searchTV(item.title);
            const match = searchRes.results?.find((r) => {
              if (item.year && r.first_air_date) {
                return r.first_air_date.startsWith(String(item.year));
              }
              return true;
            }) || searchRes.results?.[0];
            if (match) tmdbId = match.id;
          } else {
            const searchRes = await searchMovies(item.title);
            const match = searchRes.results?.find((r) => {
              if (item.year && r.release_date) {
                return r.release_date.startsWith(String(item.year));
              }
              return true;
            }) || searchRes.results?.[0];
            if (match) tmdbId = match.id;
          }
        }

        if (tmdbId) {
          if (item.targetList === "watched") {
            await addToWatched(tmdbId, item.mediaType, item.rating, item.note, "completed");
          } else {
            await addToWatchlist(tmdbId, item.mediaType);
          }
          successCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsImporting(false);
    setImportStats({ success: successCount, failed: failedCount });
    toast.success(
      t("settings.importCompleteToast", "Import finished! Added {{count}} titles to your library.", {
        count: successCount,
      })
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <UploadCloud className="h-4 w-4" />
            <span>{t("settings.importLibrary", "Import library")}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("settings.importLibraryTitle", "Import your library")}</DialogTitle>
          <DialogDescription>
            {t(
              "settings.importLibraryDesc",
              "Import your watched history and watchlist from Letterboxd (CSV), Trakt (CSV), or CineTrekker (JSON)."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!parseResult ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/70 p-6 text-center hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground/70 mb-2" />
              <p className="text-sm font-medium text-foreground">
                {t("settings.chooseImportFile", "Click to choose CSV or JSON file")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports Letterboxd watched.csv, watchlist.csv, ratings.csv, or Trakt export
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Detected format: <span className="font-semibold text-foreground uppercase">{parseResult.source.replace("_", " ")}</span> ({parseResult.items.length} titles)
                  </p>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Importing titles into CineTrekker…</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {importStats && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Import completed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Successfully imported {importStats.success} titles.
                      {importStats.failed > 0 && ` (${importStats.failed} could not be matched).`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isImporting}
          >
            {importStats ? t("common.close", "Close") : t("common.cancel", "Cancel")}
          </Button>

          {parseResult && !importStats && (
            <Button
              type="button"
              size="sm"
              onClick={runImport}
              disabled={isImporting || parseResult.items.length === 0}
              className="gap-2"
            >
              {isImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isImporting
                ? t("settings.importing", "Importing…")
                : t("settings.startImport", "Start import ({{count}})", { count: parseResult.items.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
