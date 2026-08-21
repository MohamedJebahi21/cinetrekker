import { type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";

type MotionRevealSectionProps = {
  children: ReactNode;
  className?: string;
  /** Retained for backwards-compatible call sites; decorative backgrounds are intentionally disabled. */
  accentOpacityClassName?: string;
  tone?: "soft" | "standard" | "bold";
  delayClassName?: string;
};

/**
 * A quiet viewport reveal for home sections. Product content, not an animated
 * background effect, defines the hierarchy; reduced-motion users see content
 * immediately.
 */
export function MotionRevealSection({
  children,
  className,
  tone = "standard",
  delayClassName,
}: MotionRevealSectionProps) {
  const reduceMotion = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ rootMargin: "160px" });

  const toneClasses =
    tone === "soft"
      ? {
          hidden: "translate-y-2 opacity-0",
          active: "translate-y-0 opacity-100",
          duration: "duration-200",
        }
      : {
          hidden: "translate-y-3 opacity-0",
          active: "translate-y-0 opacity-100",
          duration: "duration-300",
        };

  return (
    <section
      ref={ref}
      className={cn(
        "relative",
        reduceMotion
          ? "opacity-100"
          : cn("transition-[opacity,transform] ease-out", toneClasses.hidden, toneClasses.duration, delayClassName),
        inView && toneClasses.active,
        className,
      )}
    >
      {children}
    </section>
  );
}
