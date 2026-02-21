import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Play from 'lucide-react/dist/esm/icons/play';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import BookmarkCheck from 'lucide-react/dist/esm/icons/bookmark-check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { Link } from 'react-router-dom';
import { getTrending, getBackdropUrl, getMediaTitle, getMovieVideos, getTVVideos, getMediaType } from '@/services/tmdb';
import { Button } from '@/components/ui/button';
import { useUserLists } from '@/contexts/user-lists-context';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Image } from '@/components/ui/Image';

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useUserLists();
  const language = i18n.language;
  const [showTrailer, setShowTrailer] = useState(false);

  const { data: trendingDay, isLoading } = useQuery({
    queryKey: ['trending', 'day', language],
    queryFn: () => getTrending('all', 'day', language),
  });

  const heroMedia = trendingDay?.results?.[0];
  const mediaType = heroMedia ? getMediaType(heroMedia) : 'movie';
  const heroBackdropUrl = heroMedia?.backdrop_path 
    ? `${getBackdropUrl(heroMedia.backdrop_path, 'w780')} 780w, ${getBackdropUrl(heroMedia.backdrop_path, 'w1280')} 1280w`
    : null;

  // Fetch trailer
  const { data: videos } = useQuery({
    queryKey: ['videos', mediaType, heroMedia?.id, language],
    queryFn: () => mediaType === 'movie' 
      ? getMovieVideos(heroMedia!.id, language)
      : getTVVideos(heroMedia!.id, language),
    enabled: !!heroMedia?.id,
  });

  const trailer = videos?.results?.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  ) || videos?.results?.find(
    (v) => v.site === 'YouTube'
  );

  const inWatchlist = heroMedia ? isInWatchlist(heroMedia.id, mediaType) : false;

  const handleWatchlist = () => {
    if (!heroMedia || !user) return;
    if (inWatchlist) {
      removeFromWatchlist(heroMedia.id, mediaType);
    } else {
      addToWatchlist(heroMedia.id, mediaType);
    }
  };

  if (isLoading || !heroMedia) {
    return (
      <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh] flex items-center bg-background">
        <div className="absolute inset-0 skeleton-shimmer" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden min-h-[60vh] md:min-h-[80vh] flex items-center">
      {/* Optimized Backdrop Image */}
      {heroBackdropUrl && (
        <Image
          src={heroBackdropUrl}
          alt={getMediaTitle(heroMedia)}
          width={1280}
          height={720}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Vignette to softly fade poster edges into True Black */}
      <div className="vignette-overlay" />
      
      {/* Enhanced Gradient Overlays - Deeper bottom for content readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent" style={{ backgroundSize: '100% 100%' }} />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent md:via-background/50" />
      {/* Subtle red-to-transparent overlay (bottom -> top) to blend poster into the page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(229,9,20,0.12) 0%, rgba(229,9,20,0.06) 25%, transparent 60%)'
        }}
      />
      {/* Extra bottom gradient for "Because You Liked" section readability */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
      
      {/* Trailer Overlay */}
      {showTrailer && trailer && (
        <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center">
          <button 
            onClick={() => setShowTrailer(false)}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={t('actions.close', 'Close')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-full max-w-5xl aspect-video mx-4">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
              title={trailer.name}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
      
      <div className="relative container mx-auto px-4 py-24 md:py-40 pt-20 md:pt-32 z-10">
        <div className="max-w-2xl">
          {/* Main Page Heading */}
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {user ? t('home.welcome', 'Hey there!') : t('home.welcomeBack', 'Welcome to CineTrekker!')}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-4 md:mb-6">
            {t('home.subtitle', 'Ready to dive in?')}
          </p>

          {/* Featured / Trending Badge */}
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="trending-badge">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
              <span className="uppercase tracking-wider">#1 {t('home.trending', 'Trending')} {t('home.today', 'Today')}</span>
            </div>
          </div>

          {/* Trending Media Title */}
          <h2 className="text-3xl md:text-6xl lg:text-7xl font-bold mb-3 md:mb-4 leading-tight heading-cinematic">
            {getMediaTitle(heroMedia)}
          </h2>

          {/* Overview - max 2 lines on mobile with ellipsis */}
          {heroMedia.overview && (
            <p className="text-sm md:text-lg text-muted-foreground max-w-xl leading-relaxed mb-4 md:mb-6 line-clamp-2 md:line-clamp-3">
              {heroMedia.overview}
            </p>
          )}

          {/* Rating & Meta - Compact on mobile */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 md:mb-8 text-xs md:text-sm">
            {heroMedia.vote_average > 0 && (
              <span className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/20 text-primary font-semibold">
                ★ {heroMedia.vote_average.toFixed(1)}
              </span>
            )}
            {(heroMedia.release_date || heroMedia.first_air_date) && (
              <span className="text-muted-foreground">
                {new Date(heroMedia.release_date || heroMedia.first_air_date || '').getFullYear()}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-[10px] md:text-xs uppercase">
              {mediaType === 'movie' ? t('common.movie') : t('common.tvShow')}
            </span>
          </div>
          
          {/* CTA Buttons - Side by side on mobile for vertical space savings */}
          <div className="flex flex-row items-center gap-2 md:gap-3">
            {/* Watch Trailer Button */}
            {trailer && (
              <Button 
                  size="default"
                  onClick={() => setShowTrailer(true)}
                  className="btn-primary-glow gap-2 h-11 md:h-12 px-4 md:px-6 text-sm md:text-base flex-1 md:flex-none bg-primary text-white"
                  aria-label={t('actions.watchTrailer', 'Watch Trailer')}
                >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                <span className="hidden xs:inline">{t('actions.watchTrailer', 'Watch Trailer')}</span>
                <span className="xs:hidden">Trailer</span>
              </Button>
            )}

            {/* View Details Button */}
            <Link to={`/${mediaType}/${heroMedia.id}`} className="flex-1 md:flex-none">
              <Button 
                size="default"
                variant={trailer ? "outline" : "default"}
                className={cn(
                  "gap-2 h-11 md:h-12 px-4 md:px-6 text-sm md:text-base w-full",
                  trailer ? "border-[rgba(255,255,255,0.2)] hover:bg-white/10" : "btn-primary-glow"
                )}
                aria-label={t('home.viewDetails', `View details for ${heroMedia.title}`)}
              >
                {t('home.viewDetails', 'More Info')}
              </Button>
            </Link>

            {/* Add to Watchlist Button - Icon only on mobile */}
            {user && (
              <Button 
                size="default"
                variant="outline"
                onClick={handleWatchlist}
                className={cn(
                  "gap-2 h-11 md:h-12 px-3 md:px-6 text-sm md:text-base border-white/20 transition-all action-bounce",
                  inWatchlist 
                    ? "bg-primary/20 border-primary/50 text-primary hover:bg-primary/30" 
                    : "hover:bg-white/10"
                )}
                aria-label={inWatchlist ? t('actions.removeFromWatchlist') : t('actions.addToWatchlist')}
              >
                {inWatchlist ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden md:inline">{t('actions.inWatchlist', 'In Watchlist')}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden md:inline">{t('actions.addToWatchlist')}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
