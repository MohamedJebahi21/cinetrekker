import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  count?: number;
  variant?: 'card' | 'text' | 'hero' | 'line';
  className?: string;
  active?: boolean;
}

export function Skeleton({ 
  count = 1, 
  variant = 'card', 
  className = '',
  active = true,
}: SkeletonProps) {
  const baseClass = 'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]';
  
  const variants = {
    card: 'w-full h-56 rounded-lg',
    text: 'w-full h-4 rounded mb-2',
    hero: 'w-full h-96 rounded-xl',
    line: 'w-full h-3 rounded',
  };

  const animationVariants = {
    initial: { backgroundPosition: '200% 0' },
    animate: active ? { 
      backgroundPosition: '-200% 0',
      transition: { duration: 1.5, repeat: Infinity, ease: 'linear' }
    } : {},
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={animationVariants}
          initial="initial"
          animate="animate"
          className={`${baseClass} ${variants[variant]}`}
        />
      ))}
    </div>
  );
}

interface MediaGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function MediaGridSkeleton({ count = 12, columns = 6 }: MediaGridSkeletonProps) {
  const gridColsMap = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const gridClass = gridColsMap[columns];

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      className={`grid ${gridClass} gap-3 sm:gap-4 md:gap-6`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={itemVariants} className="space-y-3">
          <div className="aspect-[2/3] bg-gradient-to-br from-muted to-muted-foreground/20 rounded-lg animate-shimmer" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </motion.div>
      ))}
    </motion.div>
  );
}

interface ListSkeletonProps {
  count?: number;
  lines?: number;
}

export function ListSkeleton({ count = 5, lines = 2 }: ListSkeletonProps) {
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={itemVariants} className="space-y-2">
          <Skeleton variant="line" count={lines} />
        </motion.div>
      ))}
    </motion.div>
  );
}
