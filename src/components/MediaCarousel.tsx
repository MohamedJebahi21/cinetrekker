import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Media } from "@/types/media";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { PaginationDotButton, PaginationDots } from "@/components/ui/pagination-dots";

type ScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  activePage: number;
  pageCount: number;
};

interface MediaCarouselProps {
  title: string;
  items: Media[];
  loading?: boolean;
  showMoreLink?: string;
  emptyMessage?: string;
  showManualNav?: boolean;
  scrollSnap?: "mandatory" | "proximity";
}

const DEFAULT_SCROLL_STATE: ScrollState = {
  canScrollLeft: false,
  canScrollRight: true,
  activePage: 0,
  pageCount: 1,
};

function areScrollStatesEqual(a: ScrollState, b: ScrollState): boolean {
  return (
    a.canScrollLeft === b.canScrollLeft &&
    a.canScrollRight === b.canScrollRight &&
    a.activePage === b.activePage &&
    a.pageCount === b.pageCount
  );
}

function getScrollState(container: HTMLDivElement): ScrollState {
  const cards = Array.from(container.children) as HTMLElement[];
  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const hasScrollableWidth = maxScrollLeft > 0;
  const pageCount = hasScrollableWidth
    ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
    : 1;
  let nearestChildIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - container.scrollLeft);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestChildIndex = index;
    }
  });

  const activePage = hasScrollableWidth && cards.length > 1
    ? Math.min(
        pageCount - 1,
        Math.round((nearestChildIndex / (cards.length - 1)) * (pageCount - 1)),
      )
    : 0;

  return {
    canScrollLeft: hasScrollableWidth && container.scrollLeft > 10,
    canScrollRight: hasScrollableWidth && container.scrollLeft < maxScrollLeft - 10,
    activePage,
    pageCount,
  };
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
  const filteredItems = applySafetyFilter(items, strictFiltering, moderateFiltering);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollCheckFrameRef = useRef<number | null>(null);
  const scrollSettleTimeoutRef = useRef<number | null>(null);

  const [scrollState, setScrollState] = useState<ScrollState>(DEFAULT_SCROLL_STATE);

  const syncScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nextState = getScrollState(container);
    setScrollState((prev) => (areScrollStatesEqual(prev, nextState) ? prev : nextState));
  }, []);

  const scheduleScrollSync = useCallback(() => {
    if (scrollCheckFrameRef.current !== null) return;

    scrollCheckFrameRef.current = window.requestAnimationFrame(() => {
      scrollCheckFrameRef.current = null;
      syncScrollState();
    });
  }, [syncScrollState]);

  const scheduleSettledScrollSync = useCallback(() => {
    if (scrollSettleTimeoutRef.current !== null) {
      window.clearTimeout(scrollSettleTimeoutRef.current);
    }

    scrollSettleTimeoutRef.current = window.setTimeout(() => {
      scrollSettleTimeoutRef.current = null;
      scheduleScrollSync();
    }, 120);
  }, [scheduleScrollSync]);

  useEffect(() => {
    syncScrollState();

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => scheduleSettledScrollSync();
    const handleResize = () => scheduleScrollSync();

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => scheduleScrollSync());
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();

      if (scrollCheckFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollCheckFrameRef.current);
        scrollCheckFrameRef.current = null;
      }

      if (scrollSettleTimeoutRef.current !== null) {
        window.clearTimeout(scrollSettleTimeoutRef.current);
        scrollSettleTimeoutRef.current = null;
      }
    };
  }, [filteredItems.length, scheduleScrollSync, scheduleSettledScrollSync, syncScrollState]);

  const handleManualScroll = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollDistance = Math.floor(container.clientWidth * 0.9);
    container.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
  }, []);

  const scrollToPage = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const pageCount = Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth));
    const targetChildIndex =
      pageCount <= 1 || cards.length <= 1
        ? 0
        : Math.round((index * (cards.length - 1)) / (pageCount - 1));

    cards[targetChildIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }, []);

  return (
    <section className="animate-fade-in group/carousel">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>

        {showMoreLink ? (
          <Button asChild variant="ghost" size="sm" className="w-full gap-1 sm:w-auto">
            <Link to={showMoreLink}>
              {t("common.seeAll")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="min-w-[132px] sm:min-w-[160px] md:min-w-[180px]">
              <MediaCardSkeleton />
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="relative group/scroll">
          {showManualNav ? (
            <>
              <button
                type="button"
                onClick={() => handleManualScroll("left")}
                disabled={!scrollState.canScrollLeft}
                className="absolute -left-5 top-1/3 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:-left-7 md:flex"
                aria-label={t("common.previous") || "Previous"}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={() => handleManualScroll("right")}
                disabled={!scrollState.canScrollRight}
                className="absolute -right-5 top-1/3 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:-right-7 md:flex"
                aria-label={t("common.next") || "Next"}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div
            ref={scrollContainerRef}
            className={`hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 overscroll-x-contain [scrollbar-width:none] ${scrollSnap === "mandatory" ? "snap-mandatory" : "snap-proximity"}`}
          >
            {filteredItems.map((item) => (
              <div
                key={`${item.id}-${item.media_type || "unknown"}`}
                className="h-72 w-[132px] flex-shrink-0 snap-start [content-visibility:auto] [contain-intrinsic-size:160px_360px] sm:h-80 sm:w-[140px] md:w-[160px]"
              >
                <MediaCard media={item} interactionMode="rail" />
              </div>
            ))}
          </div>

          <div
            className={`pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-background to-transparent transition-opacity md:hidden ${scrollState.canScrollLeft ? "opacity-100" : "opacity-0"}`}
          />
          <div
            className={`pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent transition-opacity md:hidden ${scrollState.canScrollRight ? "opacity-100" : "opacity-0"}`}
          />

          {scrollState.pageCount > 1 ? (
            <PaginationDots>
              {Array.from({ length: scrollState.pageCount }).map((_, index) => (
                <PaginationDotButton
                  key={`${title}-page-${index}`}
                  onClick={() => scrollToPage(index)}
                  active={index === scrollState.activePage}
                  aria-label={`Go to carousel page ${index + 1}`}
                  aria-pressed={index === scrollState.activePage}
                />
              ))}
            </PaginationDots>
          ) : null}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          {emptyMessage || t("common.noResults")}
        </div>
      )}
    </section>
  );
}
