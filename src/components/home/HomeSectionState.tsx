import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getRequestReference } from "@/lib/requestReference";

type HomeSectionStateProps = {
  title: string;
  description?: string;
  children: ReactNode;
  skeleton?: ReactNode;
  loading?: boolean;
  timedOut?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

function HomeSectionFallback({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  requestReference,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  requestReference?: string | null;
}) {
  return (
    <section className="home-section-shell">
      <div className="ct-panel min-h-[420px] p-6 text-center sm:min-h-[520px]">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {requestReference ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Reference: {requestReference}
          </p>
        ) : null}
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 gap-2"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function HomeSectionState({
  title,
  description,
  children,
  skeleton,
  loading = false,
  timedOut = false,
  error = null,
  onRetry,
}: HomeSectionStateProps) {
  if (error) {
    return (
      <HomeSectionFallback
        title={title}
        description={
          description ||
          "We couldn't load this section right now. Please try again."
        }
        onRetry={onRetry}
        requestReference={getRequestReference(error)}
      />
    );
  }

  if (timedOut) {
    return (
      <HomeSectionFallback
        title={title}
        description="This section is still loading. Try again in a moment."
        onRetry={onRetry}
        retryLabel="Try again"
      />
    );
  }

  if (loading) {
    return (
      <section className="home-section-shell min-h-[640px] sm:min-h-[720px]">
        {skeleton ?? null}
      </section>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <section className="home-section-shell">
          <HomeSectionFallback
            title={title}
            description={
              description ||
              "Something went wrong rendering this section. Please try again."
            }
            onRetry={onRetry}
          />
        </section>
      }
      onRetry={onRetry}
    >
      <section className="home-section-shell">{children}</section>
    </ErrorBoundary>
  );
}
