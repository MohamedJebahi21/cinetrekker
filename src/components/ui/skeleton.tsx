import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional animation variant
   * - shimmer: Moving gradient effect (default)
   * - pulse: Opacity pulsing
   * - none: Static for reduced motion
   */
  animation?: 'shimmer' | 'pulse' | 'none';
  /**
   * Delay before animation starts (ms)
   */
  delay?: number;
}

function Skeleton({
  className,
  animation = 'shimmer',
  delay = 0,
  ...props
}: SkeletonProps) {
  // Respect user's motion preferences
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const effectiveAnimation = prefersReducedMotion ? 'none' : animation;

  const shimmerVariants = {
    initial: { backgroundPosition: '200% 0' },
    animate: {
      backgroundPosition: '-200% 0',
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
        delay: delay / 1000,
      },
    },
  };

  const pulseVariants = {
    initial: { opacity: 0.6 },
    animate: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: delay / 1000,
      },
    },
  };

  const baseClasses = cn(
    'relative overflow-hidden rounded-md bg-muted',
    effectiveAnimation === 'shimmer' &&
      'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]',
    className
  );

  if (effectiveAnimation === 'none') {
    return <div className={baseClasses} {...props} />;
  }

  return (
    <motion.div
      className={baseClasses}
      variants={effectiveAnimation === 'shimmer' ? shimmerVariants : pulseVariants}
      initial="initial"
      animate="animate"
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
