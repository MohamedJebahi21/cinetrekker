import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Media } from "@/types/media";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";

interface MediaCarouselProps {
  title: string;
  items: Media[];
  loading?: boolean;
  showMoreLink?: string;
  emptyMessage?: string;
  showManualNav?: boolean;
  scrollSnap?: "mandatory" | "proximity";
}

export function MediaCarousel({
  title,
  items,
  loading = false,
  showMoreLink,
  emptyMessage,
  showManualNav = true,
  scrollSnap = "proximity",
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: true });
  const [activePage, setActivePage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const filteredItems = applySafetyFilter(items, strictFiltering, moderateFiltering);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hasScroll = container.scrollWidth > container.clientWidth;
    const totalPages = hasScroll
      ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
      : 1;
    const nextPage = hasScroll
      ? Math.min(totalPages - 1, Math.round(container.scrollLeft / container.clientWidth))
      : 0;

    setPageCount(totalPages);
    setActivePage(nextPage);
    setCanScroll({
      left: hasScroll && container.scrollLeft > 10,
      right: hasScroll && container.scrollLeft < container.scrollWidth - container.clientWidth - 10,
    });
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => checkScroll();
    const handleResize = () => checkScroll();

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [filteredItems.length]);

  const handleManualScroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollDistance = Math.floor(container.clientWidth * 0.9);
    const targetScroll =
      container.scrollLeft + (direction === "left" ? -scrollDistance : scrollDistance);
    container.scrollTo({ left: targetScroll, behavior: "smooth" });
  };

  return (
    <section
      className="animate-fade-in group/carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {showMoreLink && (
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to={showMoreLink}>
              {t("common.seeAll")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[160px] md:min-w-[180px]">
              <MediaCardSkeleton />
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="relative group/scroll">
          {showManualNav && (
            <>
              <button
                type="button"
                onClick={() => handleManualScroll("left")}
                disabled={!canScroll.left}
                className="absolute -left-5 md:-left-7 top-1/3 z-10 hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={t("common.previous") || "Previous"}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => handleManualScroll("right")}
                disabled={!canScroll.right}
                className="absolute -right-5 md:-right-7 top-1/3 z-10 hidden md:flex items-center justify-center h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={t("common.next") || "Next"}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Scrollable container — scrollbar hidden */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth overscroll-contain"
            style={{
              scrollSnapType: `x ${scrollSnap}`,
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
            onScroll={checkScroll}
          >
            <style>{`
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            {filteredItems.map((item) => (
              <div
                key={`${item.id}-${item.media_type || "unknown"}`}
                className="flex-shrink-0 w-[140px] md:w-[160px] h-80"
                style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
              >
                <MediaCard media={item} />
              </div>
            ))}
          </div>

          {/* Edge fade gradients for mobile */}
          <div
            className={`pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-background to-transparent md:hidden transition-opacity ${canScroll.left ? "opacity-100" : "opacity-0"}`}
          />
          <div
            className={`pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent md:hidden transition-opacity ${canScroll.right ? "opacity-100" : "opacity-0"}`}
          />

          {/* Pagination dots */}
          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={`${title}-page-${index}`}
                  type="button"
                  onClick={() => {
                    const container = scrollContainerRef.current;
                    if (!container) return;
                    container.scrollTo({
                      left: container.clientWidth * index,
                      behavior: "smooth",
                    });
                  }}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activePage
                      ? "w-6 bg-primary"
                      : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  }`}
                  aria-label={`Go to carousel page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage || t("common.noResults")}
        </div>
      )}
    </section>
  );
}