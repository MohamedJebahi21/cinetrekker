import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Media } from '@/types/media';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Button } from '@/components/ui/button';

interface MediaCarouselProps {
  title: string;
  items: Media[];
  loading?: boolean;
  showMoreLink?: string;
  emptyMessage?: string;
  showManualNav?: boolean;
}

/**
 * Enhanced MediaCarousel with scroll-snap support and manual navigation
 * Features:
 * - Native CSS scroll-snap for smooth, performant scrolling
 * - Manual left/right navigation buttons with scroll detection
 * - Responsive sizing across all breakpoints
 * - Touch-optimized with smooth scrolling behavior
 * - Disabled state for nav buttons when at scroll boundaries
 */
export function MediaCarouselEnhanced({
  title,
  items,
  loading = false,
  showMoreLink,
  emptyMessage,
  showManualNav = true,
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: true });
  const [activePage, setActivePage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  // Check if horizontal scrolling is possible and current position
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

  // Initialize scroll state and listen for changes
  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => checkScroll();
    const handleResize = () => checkScroll();
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Recheck when items change
    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [items.length]);

  // Manual scroll handler for navigation buttons
  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollDistance = 400; // Scroll approximately 2 cards
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollDistance : scrollDistance);
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  return (
    <section className="animate-fade-in group/carousel">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold md:text-2xl">{typeof title === 'string' ? title.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase()) : title}</h2>
        {showMoreLink && (
          <Link to={showMoreLink}>
            <Button variant="ghost" size="sm" className="w-full gap-1 sm:w-auto">
              {t('common.seeAll').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase())}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="min-h-[420px] sm:min-h-[520px]">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-[132px] sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px] xl:min-w-[240px]">
                <MediaCardSkeleton />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 rounded-full ${i === 0 ? 'w-6 bg-primary' : 'w-2.5 bg-primary/30'}`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className="relative group/scroll">
          {/* Manual scroll buttons for desktop - visible on hover or always for mobile */}
          {showManualNav && (
            <>
              <button
                onClick={() => handleManualScroll('left')}
                disabled={!canScroll.left}
                type="button"
                className="absolute -left-4 md:-left-6 top-1/3 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group-hover/scroll:opacity-100"
                aria-label={t('common.previous') ? t('common.previous').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase()) : 'Previous'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleManualScroll('right')}
                disabled={!canScroll.right}
                type="button"
                className="absolute -right-4 md:-right-6 top-1/3 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group-hover/scroll:opacity-100"
                aria-label={t('common.next') ? t('common.next').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase()) : 'Next'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Scrollable container with scroll-snap */}
          <div
            ref={scrollContainerRef}
            className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scroll-smooth overscroll-contain touch-pan-x"
            onScroll={checkScroll}
          >
            {items.map((item) => (
              <div
                key={`${item.id}-${item.media_type || 'unknown'}`}
                className="w-[132px] flex-shrink-0 snap-start sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]"
              >
                <MediaCard media={item} />
              </div>
            ))}
          </div>

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
                  className={`rounded-full transition-all ${
                    index === activePage
                      ? "h-2.5 w-6 bg-primary"
                      : "h-2.5 w-2.5 bg-primary/30 hover:bg-primary/55"
                  }`}
                  aria-label={`Go to carousel page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground sm:min-h-[520px]">
          <p className="max-w-md px-4">
            {(emptyMessage || t('common.noResults')).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase())}
          </p>
        </div>
      )}
    </section>
  );
}

export default MediaCarouselEnhanced;
