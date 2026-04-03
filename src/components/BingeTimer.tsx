import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Pause, Play, RotateCcw } from "lucide-react";

export function BingeTimer() {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const reset = () => {
    setSeconds(0);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">
          {t("bingeTimer.title", "Binge-Watch Timer")}
        </h3>
      </div>

      <div className="text-center mb-6">
        <div className="text-4xl font-bold font-mono text-primary mb-2">
          {formatTime(seconds)}
        </div>
        <p className="text-sm text-muted-foreground">
          {isRunning
            ? t("bingeTimer.watchingNow", "Currently watching...")
            : t("bingeTimer.startTracking", "Start tracking your watch time")}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          onClick={() => setIsRunning(!isRunning)}
          variant={isRunning ? "outline" : "default"}
          size="sm"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" />
              {t("bingeTimer.pause", "Pause")}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {t("bingeTimer.start", "Start")}
            </>
          )}
        </Button>

        <Button onClick={reset} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t("bingeTimer.reset", "Reset")}
        </Button>
      </div>

      {seconds > 0 && (
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <p>
            {seconds >= 3600
              ? t("bingeTimer.epic", "🎬 Epic binge session!")
              : seconds >= 1800
                ? t("bingeTimer.gettingIntoIt", "📺 Getting into it!")
                : t("bingeTimer.justStarted", "⏱️ Just getting started")}
          </p>
        </div>
      )}
    </Card>
  );
}
