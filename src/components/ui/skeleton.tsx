import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animation = 'shimmer',
  delay = 0,
  ...props
}) => {
  const shimmerKeyframes = {
    initial: { transform: 'translateX(-100%)' },
    animate: {
      transform: 'translateX(100%)',
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
        delay: delay / 1000,
      },
    },
  };

  const pulseKeyframes = {
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

  const effectiveAnimation = animation === 'shimmer' ? shimmerKeyframes : pulseKeyframes;

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        animation === 'shimmer' && 'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted',
        className
      )}
      variants={effectiveAnimation}
      initial="initial"
      animate="animate"
      {...props}
    />
  );
};

export default Skeleton;
export type { SkeletonProps };
