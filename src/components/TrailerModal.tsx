import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMovieVideos, getTVVideos, VideoResult } from '@/services/tmdb';

type Props = {
  id: number;
  mediaType: 'movie' | 'tv';
  open: boolean;
  onClose: () => void;
};

export default function TrailerModal({ id, mediaType, open, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<VideoResult | null>(null);

  const queryKey = ['videos', mediaType, id];
  const { data, isLoading } = useQuery<{ results: VideoResult[] } | undefined>({
    queryKey,
    queryFn: () => (mediaType === 'movie' ? getMovieVideos(id) : getTVVideos(id)),
    enabled: open && !!id,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!data?.results) {
      setSelected(null);
      return;
    }
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
      || data.results.find(v => v.site === 'YouTube')
      || data.results[0];
    setSelected(trailer || null);
  }, [data]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Click outside handler
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contentRef.current && !contentRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-4xl rounded-lg overflow-hidden bg-black shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="absolute top-3 right-3 z-20 inline-flex items-center justify-center rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-full bg-black">
          {isLoading ? (
            <div className="flex items-center justify-center h-56 md:h-[360px]">
              <div className="text-sm text-muted-foreground">Loading trailer…</div>
            </div>
          ) : selected ? (
            <div className="w-full aspect-video">
              <iframe
                title={selected.name || 'Trailer'}
                src={`https://www.youtube.com/embed/${selected.key}?rel=0`}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-56 md:h-[360px] p-6 text-center text-sm text-muted-foreground">
              No trailer available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
