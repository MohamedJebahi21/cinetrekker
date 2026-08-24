import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleAlert, RefreshCw, ServerCrash } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HealthPayload = {
  status: "ok" | "degraded";
  service: string;
  checkedAt: string;
  requestId?: string;
  dependencies: Record<string, boolean>;
};

function formatCheckedAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ServiceStatus() {
  const { t, i18n } = useTranslation();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch("/api/health", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as HealthPayload;
      if (!payload || (payload.status !== "ok" && payload.status !== "degraded")) {
        throw new Error("Invalid health response");
      }
      setHealth(payload);
    } catch {
      setHealth(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const isOperational = health?.status === "ok";
  const headline = hasError
    ? t("serviceStatus.unavailableTitle", "We could not reach the status service")
    : isOperational
      ? t("serviceStatus.operationalTitle", "CineTrekker is operational")
      : t("serviceStatus.degradedTitle", "CineTrekker needs attention");

  return (
    <>
      <SEO
        title={t("serviceStatus.seoTitle", "Service status | CineTrekker")}
        description={t(
          "serviceStatus.seoDescription",
          "Live configuration readiness for CineTrekker services.",
        )}
        robots="noindex,nofollow"
      />
      <div className="page-container py-10 sm:py-14">
        <section className="mx-auto max-w-3xl">
          <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-card sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("serviceStatus.eyebrow", "Service health")}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {headline}
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  {t(
                    "serviceStatus.description",
                    "This page shows whether CineTrekker’s essential service configuration is ready. It never exposes account information or private configuration values.",
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => void loadHealth()}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                {t("serviceStatus.refresh", "Check again")}
              </Button>
            </div>

            <div
              className={cn(
                "mt-7 rounded-2xl border p-5",
                hasError
                  ? "border-destructive/35 bg-destructive/10"
                  : isOperational
                    ? "border-emerald-500/25 bg-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/10",
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {hasError ? (
                  <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                ) : isOperational ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold text-foreground">
                    {isLoading
                      ? t("serviceStatus.checking", "Checking services…")
                      : headline}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {hasError
                      ? t(
                          "serviceStatus.unavailableDescription",
                          "Please try again shortly. If the problem continues, send feedback with the time you saw this message.",
                        )
                      : isOperational
                        ? t(
                            "serviceStatus.operationalDescription",
                            "Essential configuration is available. Individual content providers can still have short-lived delays.",
                          )
                        : t(
                            "serviceStatus.degradedDescription",
                            "Some non-account service capabilities are temporarily unavailable. Your saved data is not changed by this status check.",
                          )}
                  </p>
                </div>
              </div>
            </div>

            {health && !isLoading ? (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("serviceStatus.dependenciesTitle", "Readiness checks")}
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label={t("serviceStatus.dependenciesTitle", "Readiness checks")}>
                  {Object.entries(health.dependencies).map(([key, ready]) => (
                    <li
                      key={key}
                      className="flex min-h-11 items-center justify-between rounded-xl border border-border/65 bg-background/55 px-3 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {t(`serviceStatus.dependencies.${key}`, key)}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          ready ? "text-emerald-500" : "text-amber-500",
                        )}
                      >
                        {ready
                          ? t("serviceStatus.available", "Available")
                          : t("serviceStatus.needsAttention", "Needs attention")}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {t("serviceStatus.checkedAt", "Last checked: {{time}}", {
                    time: formatCheckedAt(health.checkedAt, i18n.language),
                  })}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
