import { useEffect, useState } from "react";
import {
  type MotionIntensity,
  readMotionIntensityPreference,
} from "@/lib/accessibility-preferences";

export function useMotionIntensityPreference() {
  const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>(() =>
    readMotionIntensityPreference(),
  );

  useEffect(() => {
    const refresh = () => {
      setMotionIntensity(readMotionIntensityPreference());
    };

    window.addEventListener("storage", refresh);
    window.addEventListener("cinetrekker:accessibility-updated", refresh as EventListener);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("cinetrekker:accessibility-updated", refresh as EventListener);
    };
  }, []);

  return motionIntensity;
}
