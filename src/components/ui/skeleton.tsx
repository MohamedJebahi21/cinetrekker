import React from "react";
import { motion } from "framer-motion";
import { cn } from "src/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional animation variant
   * - shimmer: Moving gradient effect (default)
   * - none: Static for reduced motion
   */
  animation?: "shimmer" | "none";
  /**
   * Delay before animation starts (ms)
   */
  delay?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animation = "shimmer",
  delay = 0,
  ...props
}) => {
  // Ensure GPU optimization by adding `will-change` property to shimmer animation
  const shimmerKeyframes = {
    initial: { transform: "translateX(-100%)" },
    animate: {
      transform: "translateX(100%)",
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
        delay: delay / 1000,
      },
    },
  };

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        animation === "shimmer" &&
          "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent before:will-change-transform",
        className
      )}
      variants={animation === "shimmer" ? shimmerKeyframes : undefined}
      initial="initial"
      animate="animate"
      {...props}
    />
  );
};
