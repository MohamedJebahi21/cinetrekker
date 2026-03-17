import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getBackdropUrl, getImageUrl } from '@/services/tmdb';

type Props = {
  title: string;
  year?: number | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  rating?: number;
  children?: React.ReactNode;
};

export default function DetailsHero({ title, year, posterPath, backdropPath, rating, children }: Props) {
  const posterUrl = posterPath ? getImageUrl(posterPath, 'w500') : null;

  return (
    <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="relative overflow-hidden">
      {backdropPath && (
        <div className="absolute inset-0 -z-10">
          <img src={getBackdropUrl(backdropPath, 'w1280') || ''} alt={title} width={1280} height={720} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90" />
        </div>
      )}

      <div className="page-container py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="rounded-xl backdrop-blur-md bg-black/60 p-4 md:p-6 flex-shrink-0 w-full md:w-56 lg:w-72">
            {posterUrl ? (
              <img src={posterUrl} alt={title} width={342} height={513} className="w-full h-auto rounded-md shadow-2xl" />
            ) : (
              <div className="w-full aspect-[2/3] bg-muted rounded-md" />
            )}
          </div>

          <div className="flex-1 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Link to="/" className="text-sm text-white/80 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg inline-flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Link>
              <div className="ml-auto hidden md:block">{children}</div>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">{title}{year ? ` • ${year}` : ''}</h1>
            {rating !== undefined && (
              <div className="mt-3 inline-flex items-center gap-2 text-sm bg-black/30 backdrop-blur-sm px-3 py-1 rounded">
                <Star className="w-4 h-4" /> {rating.toFixed(1)}
              </div>
            )}

            <div className="mt-4 md:hidden">{children}</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
