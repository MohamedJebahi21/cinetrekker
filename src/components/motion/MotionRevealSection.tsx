import { Suspense, lazy, useState, useEffect, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { useMotionIntensityPreference } from "@/hooks/useMotionIntensityPreference";

const RemotionAurora = lazy(() =>
  import("@/components/motion/RemotionAurora").then((mod) => ({
    default: mod.RemotionAurora,
  })),
);

type MotionRevealSectionProps = {
  children: ReactNode;
  className?: string;
  accentOpacityClassName?: string;
  tone?: "soft" | "standard" | "bold";
  delayClassName?: string;
};

const REVEAL_IN_VIEW_OPTIONS = { rootMargin: "200px", triggerOnce: false };

export function MotionRevealSection({
  children,
  className,
  accentOpacityClassName = "opacity-35",
  tone = "standard",
  delayClassName,
}: MotionRevealSectionProps) {
  const reduceMotion = useReducedMotion();
  const motionIntensity = useMotionIntensityPreference();
  const [ref, inView] = useInView<HTMLElement>(REVEAL_IN_VIEW_OPTIONS);
  const [hasBeenRevealed, setHasBeenRevealed] = useState(false);

  useEffect(() => {
    if (inView) {
      setHasBeenRevealed(true);
    }
  }, [inView]);

  const toneClasses =
    tone === "bold"
      ? {
          hidden: "translate-y-6 opacity-0",
          active: "translate-y-0 opacity-100",
          duration: "duration-700",
        }
      : tone === "soft"
        ? {
            hidden: "translate-y-3 opacity-0",
            active: "translate-y-0 opacity-100",
            duration: "duration-500",
          }
        : {
            hidden: "translate-y-4 opacity-0",
            active: "translate-y-0 opacity-100",
            duration: "duration-650",
          };

  return (
    <section
      ref={ref}
      className={cn(
        "relative isolate",
        reduceMotion
          ? "opacity-100"
          : cn("transition-all ease-out", toneClasses.hidden, toneClasses.duration, delayClassName),
        (reduceMotion || hasBeenRevealed) && toneClasses.active,
        className,
      )}
    >
      {!reduceMotion && inView && motionIntensity !== "low" ? (
        <div className={cn("pointer-events-none absolute inset-0 -z-10", accentOpacityClassName)}>
          <Suspense fallback={null}>
            <RemotionAurora
              paused={false}
              className={cn(
                motionIntensity === "high" ? "opacity-70" : "opacity-45",
              )}
            />
          </Suspense>
        </div>
      ) : null}

      {children}
    </section>
  );
}
