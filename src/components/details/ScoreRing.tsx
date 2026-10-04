import React from "react";

export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const scoreTone = score >= 7 ? "hsl(var(--success))" : score >= 5 ? "hsl(var(--rating-medium))" : "hsl(var(--destructive))";
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      role="meter"
      aria-label={`Score ${score.toFixed(1)} out of 10`}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={Number(score.toFixed(1))}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground) / 0.1)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={scoreTone} strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black leading-none" style={{ color: scoreTone }}>{score.toFixed(1)}</span>
        <span className="text-[8px] text-foreground/45 font-medium mt-0.5">/10</span>
      </div>
    </div>
  );
}
