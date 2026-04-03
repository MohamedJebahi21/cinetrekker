import React, { useEffect, useRef, useState } from 'react';
import { getImageUrl } from '@/services/tmdb';
import { Image } from '@/components/ui/Image';
import { PaginationDotButton, PaginationDots } from '@/components/ui/pagination-dots';
import { useTranslation } from 'react-i18next';

type Props = {
  backdrops?: Array<{ file_path: string }>;
  videos?: Array<{ key: string; name?: string; site?: string }>; 
};

function MediaGalleryInner({ backdrops = [], videos = [] }: Props) {
  const { t } = useTranslation();
  const videosRef = useRef<HTMLDivElement>(null);
  const backdropsRef = useRef<HTMLDivElement>(null);
  const [activeVideoPage, setActiveVideoPage] = useState(0);
  const [videoPageCount, setVideoPageCount] = useState(1);
  const [activeBackdropPage, setActiveBackdropPage] = useState(0);
  const [backdropPageCount, setBackdropPageCount] = useState(1);

  useEffect(() => {
    const bindScroller = (
      container: HTMLDivElement | null,
      setPage: React.Dispatch<React.SetStateAction<number>>,
      setCount: React.Dispatch<React.SetStateAction<number>>,
    ) => {
      if (!container) return () => undefined;

      const update = () => {
        const hasScroll = container.scrollWidth > container.clientWidth;
        const totalPages = hasScroll
          ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
          : 1;
        const nextPage = hasScroll
          ? Math.min(totalPages - 1, Math.round(container.scrollLeft / container.clientWidth))
          : 0;

        setCount(totalPages);
        setPage(nextPage);
      };

      update();
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(container);
      container.addEventListener('scroll', update, { passive: true });

      return () => {
        resizeObserver.disconnect();
        container.removeEventListener('scroll', update);
      };
    };

    const cleanupVideos = bindScroller(videosRef.current, setActiveVideoPage, setVideoPageCount);
    const cleanupBackdrops = bindScroller(
      backdropsRef.current,
      setActiveBackdropPage,
      setBackdropPageCount,
    );

    return () => {
      cleanupVideos();
      cleanupBackdrops();
    };
  }, [backdrops.length, videos.length]);

  const renderDots = (
    pageCount: number,
    activePage: number,
    container: HTMLDivElement | null,
    label: string,
  ) => {
    if (pageCount <= 1) return null;

    return (
      <PaginationDots className="mt-3">
        {Array.from({ length: pageCount }).map((_, index) => (
          <PaginationDotButton
            key={`${label}-page-${index}`}
            onClick={() =>
              container?.scrollTo({
                left: container.clientWidth * index,
                behavior: 'smooth',
              })
            }
            active={index === activePage}
            aria-label={t('mediaGallery.goToPage', 'Go to {{label}} page {{index}}', {
              label,
              index: index + 1,
            })}
            aria-pressed={index === activePage}
          />
        ))}
      </PaginationDots>
    );
  };

  if (!backdrops.length && !videos.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('mediaGallery.trailersAndClips', 'Trailers & Clips')}</h3>
        <div
          ref={videosRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {videos.slice(0,6).map((v, idx) => (
            <div key={v.key || idx} className="w-64 shrink-0 snap-start bg-muted rounded overflow-hidden">
              {v.site === 'YouTube' ? (
                <iframe title={v.name || v.key} src={`https://www.youtube.com/embed/${v.key}`} className="w-full h-36" />
              ) : (
                <div className="h-36 flex items-center justify-center">{v.name}</div>
              )}
            </div>
          ))}
        </div>
        {renderDots(videoPageCount, activeVideoPage, videosRef.current, 'trailers')}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{t('mediaGallery.backdrops', 'Backdrops')}</h3>
        <div
          ref={backdropsRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {backdrops.slice(0,8).map((b, i) => (
            <Image
              key={i}
              src={getImageUrl(b.file_path, 'w780')}
              srcSet={`${getImageUrl(b.file_path, 'w342')} 342w, ${getImageUrl(b.file_path, 'w780')} 780w`}
              sizes="288px"
              alt={t('mediaGallery.backdropAlt', 'Backdrop {{index}}', { index: i + 1 })}
              width={780}
              height={439}
              className="w-72 h-40 shrink-0 snap-start object-cover rounded-md"
              loading="lazy"
              showSkeleton
            />
          ))}
        </div>
        {renderDots(backdropPageCount, activeBackdropPage, backdropsRef.current, 'backdrops')}
      </div>
    </div>
  );
}

export const MediaGallery = React.memo(MediaGalleryInner);

export default MediaGallery;
