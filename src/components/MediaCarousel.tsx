import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Media } from '@/types/media';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

interface MediaCarouselProps {
  title: string;
  items: Media[];
  loading?: boolean;
  showMoreLink?: string;
  emptyMessage?: string;
}

export function MediaCarousel({
  title,
  items,
  loading = false,
  showMoreLink,
  emptyMessage,
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

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
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {items.map((item) => (
              <CarouselItem
                key={`${item.id}-${item.media_type || 'unknown'}`}
                className="pl-2 md:pl-4 basis-[45%] sm:basis-[30%] md:basis-[22%] lg:basis-[16%] xl:basis-[14%]"
              >
                <MediaCard media={item} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* Navigation arrows - visible on hover (desktop only) */}
          <CarouselPrevious 
            className={`hidden md:flex -left-4 bg-background/90 backdrop-blur-sm border-border shadow-lg transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`} 
          />
          <CarouselNext 
            className={`hidden md:flex -right-4 bg-background/90 backdrop-blur-sm border-border shadow-lg transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`} 
          />
        </Carousel>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage || t('common.noResults')}
        </div>
      )}
    </section>
  );
}
