import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useFollowedShows } from '@/hooks/useFollowedShows';
import { getTVDetails, getImageUrl, getMediaTitle } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';

export default function Following() {
  const { t, i18n } = useTranslation();
  const { followedShows } = useFollowedShows();
  const language = i18n.language;

  // Fetch details for all followed shows
  const { data: showDetails, isLoading } = useQuery({
    queryKey: ['followed-shows-details', followedShows.map(s => s.show_id), language],
    queryFn: async () => {
      const results = await Promise.all(
        followedShows.map(async (show) => {
          try {
            const details = await getTVDetails(show.show_id, language);
            return { 
              ...details, 
              media_type: 'tv',
              followedAt: show.followed_at,
            } as Media & { followedAt?: string };
          } catch (error) {
            console.error(`Failed to fetch details for show ${show.show_id}:`, error);
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: followedShows.length > 0,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <>
      <SEO 
        title="Following — CineTrekker" 
        description="TV shows you're currently following"
        canonical="https://cinetrekker.vercel.app/following"
      />
      <div className="page-container pt-20">
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            {t('nav.following', 'Following')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {followedShows.length} show{followedShows.length !== 1 ? 's' : ''} {t('following.followedShows', 'you\'re tracking')}
          </p>
        </div>

        {isLoading ? (
          <motion.div 
            className="media-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="aspect-[2/3] bg-gradient-to-br from-white/5 to-white/2 rounded-lg animate-pulse"
              />
            ))}
          </motion.div>
        ) : showDetails && showDetails.length > 0 ? (
          <motion.div 
            className="media-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {showDetails.map((show: Media & { followedAt?: string }) => {
              const title = getMediaTitle(show);
              const posterUrl = getImageUrl(show.poster_path, 'w342');
              const year = show.first_air_date?.slice(0, 4);

              return (
                <motion.div
                  key={show.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <Link
                    to={`/tv/${show.id}`}
                    className="group relative block overflow-hidden rounded-lg transition-all duration-300"
                  >
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={title}
                        className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full bg-gradient-to-br from-primary/20 to-primary/5 aspect-[2/3] flex items-center justify-center">
                        <span className="text-4xl">📺</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="font-bold text-sm line-clamp-2 text-white mb-1">{title}</h3>
                      {year && (
                        <p className="text-xs text-gray-300">{year}</p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <EmptyState
            icon={Heart}
            title={t('following.empty', 'No shows being followed')}
            description={t('following.emptyDesc', 'Start following shows to track new episodes and get updates')}
            action={{
              label: t('following.discoverShows', 'Discover Shows'),
              href: '/search?type=tv',
            }}
          />
        )}
      </div>
    </>
  );
}
