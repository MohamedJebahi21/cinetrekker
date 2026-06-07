import { useState, useRef, useEffect } from 'react';
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
  scrollSnap?: 'mandatory' | 'proximity';
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
  scrollSnap = 'proximity',
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: true });

  // Check if horizontal scrolling is possible and current position
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hasScroll = container.scrollWidth > container.clientWidth;
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
    <section 
      className="animate-fade-in group/carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {showMoreLink && (
          <Link to={showMoreLink}>
            <Button variant="ghost" size="sm" className="gap-1">
              {t('common.seeAll')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
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
      ) : items.length > 0 ? (
        <div className="relative group/scroll">
          {/* Manual scroll buttons for desktop - visible on hover or always for mobile */}
          {showManualNav && (
            <>
              <button
                onClick={() => handleManualScroll('left')}
                disabled={!canScroll.left}
                className="absolute -left-4 md:-left-6 top-1/3 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group-hover/scroll:opacity-100"
                aria-label={t('common.previous') || 'Previous'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleManualScroll('right')}
                disabled={!canScroll.right}
                className="absolute -right-4 md:-right-6 top-1/3 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group-hover/scroll:opacity-100"
                aria-label={t('common.next') || 'Next'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Scrollable container with scroll-snap */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth overscroll-contain pb-2"
            style={{
              scrollSnapType: `x ${scrollSnap}`,
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none', // Hide scrollbar in IE/Edge
              scrollbarWidth: 'none', // Hide scrollbar in Firefox
            }}
            onScroll={checkScroll}
          >
            {/* Hide scrollbar in Webkit browsers */}
            <style>{`
              div[style*="scroll-snap-type"] {
                scrollbar-width: none;
              }
              div[style*="scroll-snap-type"]::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {items.map((item) => (
              <div
                key={`${item.id}-${item.media_type || 'unknown'}`}
                className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]"
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
              >
                <MediaCard media={item} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage || t('common.noResults')}
        </div>
      )}
    </section>
  );
}

export default MediaCarouselEnhanced;
