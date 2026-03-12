import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, MapPinned } from "lucide-react";
import { getMovieDetails, getTVDetails, getImageUrl, getMediaTitle } from "@/services/tmdb";
import { getTrekOfWeek } from "@/data/trekOfWeek";
import { Image } from "@/components/ui/Image";
import type { Media } from "@/types/media";

export function TrekOfWeekSection() {
  const feature = getTrekOfWeek();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["trek-of-week", feature.slug],
    queryFn: async () => {
      const rows = await Promise.all(
        feature.items.map(async (item) => {
          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId)
                : await getTVDetails(item.mediaId);
            return {
              ...details,
              media_type: item.mediaType,
              editorialNote: item.note,
            } as Media & { media_type: "movie" | "tv"; editorialNote: string };
          } catch {
            return {
              id: item.mediaId,
              title: item.title,
              name: item.title,
              overview: item.note,
              poster_path: null,
              backdrop_path: null,
              vote_average: 0,
              vote_count: 0,
              popularity: 0,
              media_type: item.mediaType,
              editorialNote: item.note,
            } as Media & { media_type: "movie" | "tv"; editorialNote: string };
          }
        }),
      );
      return rows;
    },
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(155deg,rgba(8,12,20,0.98),rgba(5,8,14,0.98))]">
      <div className="relative">
        <Image
          src={feature.heroImage}
          alt={feature.title}
          width={2200}
          height={1100}
          className="h-52 w-full object-cover md:h-64"
          loading="lazy"
          showSkeleton
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
          <p className="heading-credits text-xs text-[#f2c572] md:text-sm">Editorial Spotlight</p>
          <h2 className="heading-credits mt-1 text-3xl text-white md:text-5xl">Trek of the Week</h2>
          <p className="mt-1 text-xs text-white/80 md:text-sm">{feature.region}</p>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <p className="editorial-copy text-sm text-white/80 md:text-base">{feature.description}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {isLoading && (
            <div className="col-span-full text-sm text-white/65">Loading this week's trek...</div>
          )}
          {!isLoading &&
            items.map((item) => (
              <article key={`${item.media_type}-${item.id}`} className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="mb-2 flex items-center gap-2 text-[#f2c572]">
                  <Compass className="h-4 w-4" />
                  <p className="text-[10px] uppercase tracking-[0.08em]">Curated Stop</p>
                </div>
                <p className="line-clamp-1 text-sm font-semibold text-white">{getMediaTitle(item)}</p>
                <p className="mt-1 text-xs text-white/65">{(item as Media & { editorialNote?: string }).editorialNote}</p>
                <Link
                  to={`/${item.media_type}/${item.id}/locations`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#f2c572]/35 bg-[#1c1307] px-2.5 py-1 text-xs text-[#f7d499] hover:bg-[#2a1b0c]"
                >
                  <MapPinned className="h-3.5 w-3.5" />
                  View filming locations
                </Link>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}
