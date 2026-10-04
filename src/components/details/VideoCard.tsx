import React from "react";
import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaVideoResult } from "@/types/media";

export function VideoCard({ video, onPlay, featured }: { video: MediaVideoResult; onPlay: (k: string) => void; featured?: boolean }) {
  const thumb = `https://img.youtube.com/vi/${video.key}/${featured ? "hqdefault" : "mqdefault"}.jpg`;
  return (
    <button
      type="button"
      onClick={() => onPlay(video.key)}
      className={cn(
        "group relative flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary shadow-lg",
        featured ? "w-[calc(100vw-2rem)] max-w-80 md:w-80" : "w-52 md:w-56"
      )}
      aria-label={`Play ${video.name}`}
    >
      <div className="aspect-video relative">
        <img src={thumb} alt={video.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform",
            featured ? "w-14 h-14" : "w-10 h-10"
          )}>
            <PlayCircle className={cn("text-black fill-black", featured ? "w-7 h-7" : "w-5 h-5")} />
          </div>
        </div>
        {featured && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white uppercase tracking-wider">
              {video.type}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 bg-black/60 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white/90 line-clamp-1">{video.name}</p>
        {!featured && <p className="text-[10px] text-white/50 mt-0.5">{video.type}</p>}
      </div>
    </button>
  );
}
