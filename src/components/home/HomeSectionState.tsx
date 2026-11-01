import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getRequestReference } from "@/lib/requestReference";
import { AsyncSectionMessage } from "@/components/AsyncSectionMessage";

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
  requestReference,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  requestReference?: string | null;
}) {
  return (
    <section className="home-section-shell" role="alert" aria-live="polite">
      <AsyncSectionMessage
        title={title}
        description={description}
        onRetry={onRetry}
        requestReference={requestReference}
      />
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
      />
    );
  }

  if (loading) {
    return (
      <section className="home-section-shell" role="status" aria-live="polite" aria-busy="true" aria-label={`Loading ${title}`}>
        {skeleton ?? <div className="min-h-40" />}
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
