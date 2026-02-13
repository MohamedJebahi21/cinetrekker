import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Tv, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTVDetails, getTVSeasonDetails } from '@/services/tmdb';
import { Skeleton } from '@/components/ui/skeleton';

interface TVWatchStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId: number;
  showName: string;
  onWatchAll: () => void;
  onSelectEpisodes: (episodes: Array<{ season: number; episode: number }>) => void;
  language: string;
}

export function TVWatchStatusModal({
  open,
  onOpenChange,
  showId,
  showName,
  onWatchAll,
  onSelectEpisodes,
  language,
}: TVWatchStatusModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'choice' | 'select'>('choice');
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());

  // Fetch TV show details and episodes
  const { data: showDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['tv-details', showId, language],
    queryFn: async () => {
      return await getTVDetails(showId, language);
    },
    enabled: open && mode === 'select',
  });

  const { data: seasonsData, isLoading: seasonsLoading } = useQuery({
    queryKey: ['tv-seasons', showId, language],
    queryFn: async () => {
      if (!showDetails) return [];
      
      const seasons = [];
      for (let i = 1; i <= showDetails.number_of_seasons; i++) {
        try {
          const seasonDetails = await getTVSeasonDetails(showId, i, language);
          seasons.push(seasonDetails);
        } catch {
          // Season might not exist
        }
      }
      return seasons;
    },
    enabled: open && mode === 'select' && !!showDetails,
  });

  const totalEpisodes = seasonsData?.reduce((acc, season) => acc + (season.episodes?.length || 0), 0) || 0;

  const handleSelectEpisode = (seasonNum: number, episodeNum: number) => {
    const key = `${seasonNum}-${episodeNum}`;
    const newSet = new Set(selectedEpisodes);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedEpisodes(newSet);
  };

  const handleSelectSeason = (seasonNum: number, episodes: number) => {
    const newSet = new Set(selectedEpisodes);
    let hasAll = true;

    for (let i = 1; i <= episodes; i++) {
      const key = `${seasonNum}-${i}`;
      if (!newSet.has(key)) {
        hasAll = false;
        break;
      }
    }

    for (let i = 1; i <= episodes; i++) {
      const key = `${seasonNum}-${i}`;
      if (hasAll) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
    }

    setSelectedEpisodes(newSet);
  };

  const handleWatchAll = () => {
    onWatchAll();
    onOpenChange(false);
  };

  const handleSelectEpisodesConfirm = () => {
    const episodes = Array.from(selectedEpisodes).map((key) => {
      const [season, episode] = key.split('-').map(Number);
      return { season, episode };
    });
    onSelectEpisodes(episodes);
    onOpenChange(false);
    setMode('choice');
    setSelectedEpisodes(new Set());
  };

  const handleClose = () => {
    onOpenChange(false);
    setMode('choice');
    setSelectedEpisodes(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            {showName}
          </DialogTitle>
          <DialogDescription>
            {mode === 'choice'
              ? t('tv.watchStatusChoice', 'How would you like to mark this show?')
              : t('tv.selectEpisodes', 'Select the episodes you have watched')}
          </DialogDescription>
        </DialogHeader>

        {mode === 'choice' ? (
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              className="h-20 justify-start text-left"
              onClick={handleWatchAll}
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{t('tv.watchAll', 'Mark Entire Series as Watched')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('tv.watchAllDesc', 'Mark all episodes as watched')}
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-20 justify-start text-left"
              onClick={() => setMode('select')}
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{t('tv.selectEpisodes', 'Select Episodes')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('tv.selectEpisodesDesc', 'Choose specific episodes to mark as watched')}
                </span>
              </div>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {selectedEpisodes.size > 0 && (
                <Badge variant="secondary">
                  {selectedEpisodes.size} {t('common.episode', { count: selectedEpisodes.size })}
                </Badge>
              )}
            </div>

            {detailsLoading || seasonsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-4">
                  {seasonsData?.map((season) => {
                    const episodeCount = season.episodes?.length || 0;
                    const seasonNum = season.season_number;
                    const seasonSelected = Array.from({ length: episodeCount })
                      .every((_, i) => selectedEpisodes.has(`${seasonNum}-${i + 1}`));
                    const partialSelected = Array.from({ length: episodeCount })
                      .some((_, i) => selectedEpisodes.has(`${seasonNum}-${i + 1}`));

                    return (
                      <div key={season.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">
                            {t('tv.season', { number: seasonNum })}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {episodeCount} {t('common.episode', { count: episodeCount })}
                            </span>
                            <Checkbox
                              checked={seasonSelected}
                              ref={undefined}
                              onCheckedChange={() => handleSelectSeason(seasonNum, episodeCount)}
                              className={partialSelected && !seasonSelected ? 'data-[state=checked]:opacity-50' : ''}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {season.episodes?.map((episode) => {
                            const key = `${seasonNum}-${episode.episode_number}`;
                            const isSelected = selectedEpisodes.has(key);

                            return (
                              <button
                                key={key}
                                onClick={() => handleSelectEpisode(seasonNum, episode.episode_number)}
                                className={`p-2 rounded border text-xs text-center transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/30 border-border hover:bg-muted/50'
                                }`}
                              >
                                <div className="font-semibold">E{episode.episode_number}</div>
                                {episode.name && (
                                  <div className="text-[10px] line-clamp-1 opacity-75">
                                    {episode.name}
                                  </div>
                                )}
                                {isSelected && (
                                  <CheckCircle2 className="w-3 h-3 mx-auto mt-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}

        <DialogFooter>
          {mode === 'select' && (
            <>
              <Button variant="outline" onClick={() => setMode('choice')}>
                {t('common.back')}
              </Button>
              <Button
                onClick={handleSelectEpisodesConfirm}
                disabled={selectedEpisodes.size === 0}
              >
                {t('common.confirm')} ({selectedEpisodes.size})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
