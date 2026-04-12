import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AuraProps = {
  className?: string;
  paused?: boolean;
};

function AuroraComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const settle = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 60,
    },
  });

  const driftA = interpolate(frame % 420, [0, 210, 420], [-28, 26, -28]);
  const driftB = interpolate(frame % 360, [0, 180, 360], [18, -24, 18]);
  const driftC = interpolate(frame % 510, [0, 255, 510], [-14, 22, -14]);

  const glowAOpacity = 0.45 * settle;
  const glowBOpacity = 0.42 * settle;
  const glowCOpacity = 0.3 * settle;

  const glowAX = 380 + driftA;
  const glowAY = 300 + driftB;
  const glowBX = 1540 + driftB;
  const glowBY = 760 + driftC;
  const glowCX = 960 + driftC;
  const glowCY = 610 + driftA;

  return (
    <AbsoluteFill className="overflow-hidden bg-[radial-gradient(120%_140%_at_100%_0%,rgba(255,193,92,0.12)_0%,rgba(16,20,32,0.02)_45%),radial-gradient(120%_120%_at_0%_100%,rgba(255,120,86,0.10)_0%,rgba(16,20,32,0)_55%)]">
      <svg viewBox="0 0 1920 1080" className="h-full w-full">
        <defs>
          <filter id="ct-aurora-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="42" />
          </filter>
          <radialGradient id="ct-aurora-a" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,200,120,0.45)" />
            <stop offset="100%" stopColor="rgba(255,200,120,0.02)" />
          </radialGradient>
          <radialGradient id="ct-aurora-b" cx="45%" cy="45%" r="60%">
            <stop offset="0%" stopColor="rgba(130,180,255,0.34)" />
            <stop offset="100%" stopColor="rgba(130,180,255,0.02)" />
          </radialGradient>
          <radialGradient id="ct-aurora-c" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(255,110,150,0.26)" />
            <stop offset="100%" stopColor="rgba(255,110,150,0.01)" />
          </radialGradient>
        </defs>

        <circle
          cx={glowAX}
          cy={glowAY}
          r="205"
          fill="url(#ct-aurora-a)"
          opacity={glowAOpacity}
          filter="url(#ct-aurora-blur)"
        />
        <circle
          cx={glowBX}
          cy={glowBY}
          r="185"
          fill="url(#ct-aurora-b)"
          opacity={glowBOpacity}
          filter="url(#ct-aurora-blur)"
        />
        <circle
          cx={glowCX}
          cy={glowCY}
          r="150"
          fill="url(#ct-aurora-c)"
          opacity={glowCOpacity}
          filter="url(#ct-aurora-blur)"
        />
      </svg>
    </AbsoluteFill>
  );
}

export const RemotionAurora = memo(function RemotionAurora({ className, paused = false }: AuraProps) {
  const [hasUserGesture, setHasUserGesture] = useState(false);

  useEffect(() => {
    const onFirstGesture = () => setHasUserGesture(true);
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <Player
        component={AuroraComposition}
        durationInFrames={600}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls={false}
        autoPlay={!paused && hasUserGesture}
        loop={!paused && hasUserGesture}
        clickToPlay={false}
        acknowledgeRemotionLicense
        className="h-full w-full"
      />
    </div>
  );
});
