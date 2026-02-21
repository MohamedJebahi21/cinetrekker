import React from "react";
import { cn } from "../../lib/utils";

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
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted skeleton-shimmer",
        className
      )}
      style={delay ? { animationDelay: `${delay}ms`, ...style } : style}
      {...props}
    />
  );
};
