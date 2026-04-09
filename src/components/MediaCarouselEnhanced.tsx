import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Media } from "@/types/media";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import {
  PaginationDotButton,
  PaginationDots,
  PaginationDotStatic,
} from "@/components/ui/pagination-dots";

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
  showMoreLabel?: string;
  emptyMessage?: string;
  showManualNav?: boolean;
}

const DEFAULT_SCROLL_STATE: ScrollState = {
  canScrollLeft: false,
  canScrollRight: true,
  activePage: 0,
  pageCount: 1,
};

function toTitleCaseLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function areScrollStatesEqual(a: ScrollState, b: ScrollState): boolean {
  return (
    a.canScrollLeft === b.canScrollLeft &&
    a.canScrollRight === b.canScrollRight &&
    a.activePage === b.activePage &&
    a.pageCount === b.pageCount
  );
}

function getScrollState(container: HTMLDivElement, itemCount: number): ScrollState {
  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const hasScrollableWidth = maxScrollLeft > 0;
  const pageCount = hasScrollableWidth
    ? Math.max(1, Math.round(maxScrollLeft / container.clientWidth) + 1)
    : 1;

  const activePage = hasScrollableWidth && pageCount > 1
    ? Math.min(
        pageCount - 1,
        Math.max(
          0,
          Math.round((container.scrollLeft / maxScrollLeft) * (pageCount - 1)),
        ),
      )
    : 0;

  return {
    canScrollLeft: hasScrollableWidth && container.scrollLeft > 10,
    canScrollRight: hasScrollableWidth && container.scrollLeft < maxScrollLeft - 10,
    activePage,
    pageCount,
  };
}

export function MediaCarouselEnhanced({
  title,
  items,
  loading = false,
  showMoreLink,
  showMoreLabel,
  emptyMessage,
  showManualNav = true,
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollCheckFrameRef = useRef<number | null>(null);

  const [scrollState, setScrollState] = useState<ScrollState>(DEFAULT_SCROLL_STATE);

  const syncScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nextState = getScrollState(container, items.length);
    setScrollState((prev) => (areScrollStatesEqual(prev, nextState) ? prev : nextState));
  }, [items.length]);

  const scheduleScrollSync = useCallback(() => {
    if (scrollCheckFrameRef.current !== null) return;

    scrollCheckFrameRef.current = window.requestAnimationFrame(() => {
      scrollCheckFrameRef.current = null;
      syncScrollState();
    });
  }, [syncScrollState]);

  useEffect(() => {
    syncScrollState();

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => scheduleScrollSync();
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
    };
  }, [scheduleScrollSync, syncScrollState]);

  const handleManualScroll = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollDistance = Math.floor(container.clientWidth * 0.85);
    container.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
  }, []);

  const scrollToPage = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    if (maxScrollLeft <= 0) return;

    const pageCount = Math.max(1, Math.round(maxScrollLeft / container.clientWidth) + 1);
    const clampedIndex = Math.max(0, Math.min(pageCount - 1, index));
    const targetLeft =
      pageCount <= 1 ? 0 : (clampedIndex / (pageCount - 1)) * maxScrollLeft;

    container.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
  }, []);

  const headingText =
    typeof title === "string" ? toTitleCaseLabel(title) : title;
  const seeAllText = toTitleCaseLabel(showMoreLabel || t("common.seeAll"));
  const emptyText = toTitleCaseLabel(emptyMessage || t("common.noResults"));
  const previousText = t("common.previous")
    ? toTitleCaseLabel(t("common.previous"))
    : "Previous";
  const nextText = t("common.next") ? toTitleCaseLabel(t("common.next")) : "Next";

  return (
    <section className="animate-fade-in group/carousel">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold md:text-2xl">{headingText}</h2>

        {showMoreLink ? (
          <Link to={showMoreLink}>
            <Button variant="ghost" size="sm" className="w-full gap-1 sm:w-auto">
              {seeAllText}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="min-h-[420px] sm:min-h-[520px]">
          <div className="hide-scrollbar flex gap-3 overflow-hidden px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="w-[calc(50vw-1.5rem)] flex-shrink-0 sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px] xl:min-w-[240px]"
              >
                <MediaCardSkeleton />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <PaginationDots>
              {Array.from({ length: 4 }).map((_, index) => (
                <PaginationDotStatic
                  key={index}
                  active={index === 0}
                  aria-hidden="true"
                />
              ))}
            </PaginationDots>
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className="group/scroll relative pb-8">
          {showManualNav ? (
            <>
              <button
                type="button"
                onClick={() => handleManualScroll("left")}
                disabled={!scrollState.canScrollLeft}
                className="absolute left-2 top-[40%] z-10 inline-flex min-h-[48px] min-w-[48px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-sm transition-all duration-200 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:left-3 md:opacity-0 md:group-hover/scroll:opacity-100 md:focus-visible:opacity-100"
                aria-label={previousText}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => handleManualScroll("right")}
                disabled={!scrollState.canScrollRight}
                className="absolute right-2 top-[40%] z-10 inline-flex min-h-[48px] min-w-[48px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-sm transition-all duration-200 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:right-3 md:opacity-0 md:group-hover/scroll:opacity-100 md:focus-visible:opacity-100"
                aria-label={nextText}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <div
            ref={scrollContainerRef}
            className="hide-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto pb-2 overscroll-x-contain px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] [scrollbar-width:none]"
          >
            {items.map((item) => (
              <div
                key={`${item.id}-${item.media_type || "unknown"}`}
                className="w-[calc(50vw-1.5rem)] flex-shrink-0 snap-start [content-visibility:auto] [contain-intrinsic-size:220px_420px] sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]"
              >
                <MediaCard media={item} interactionMode="rail" />
              </div>
            ))}
          </div>

          {scrollState.pageCount > 1 ? (
            <div className="mt-4 flex justify-center">
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
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground sm:min-h-[520px]">
          <p className="max-w-md px-4">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

export default MediaCarouselEnhanced;
