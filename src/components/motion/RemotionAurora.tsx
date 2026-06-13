import { memo } from "react";
import { cn } from "@/lib/utils";

type AuraProps = {
  className?: string;
  paused?: boolean;
};

export const RemotionAurora = memo(function RemotionAurora({ className, paused = false }: AuraProps) {
  if (paused) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(255,193,92,0.15)_0%,rgba(16,20,32,0.02)_50%),radial-gradient(120%_120%_at_0%_100%,rgba(255,120,86,0.12)_0%,rgba(16,20,32,0)_60%)] opacity-60" />
      
      {/* Soft glowing blobs using radial-gradients - completely static with zero blur filter for maximum performance */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,200,120,0.18)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle_at_center,rgba(130,180,255,0.15)_0%,transparent_70%)]" />
        <div className="absolute top-[30%] left-[25%] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,110,150,0.12)_0%,transparent_70%)]" />
      </div>
    </div>
  );
});
