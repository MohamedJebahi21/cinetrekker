import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createLogger } from "@/lib/logger";
import { reportClientIncident } from "@/lib/operationalReporting";
import { chunkErrorRecovery } from "@/lib/chunkErrorRecovery";

const logger = createLogger("error-boundary");

function createErrorReference() {
  const suffix =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);

  return `ct-${Date.now().toString(36)}-${suffix}`;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => Promise<void> | void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
  referenceId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isRetrying: false,
    referenceId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isRetrying: false,
      referenceId: createErrorReference(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught an error", {
      referenceId: this.state.referenceId,
      error,
      errorInfo,
    });
    reportClientIncident("react_boundary", error);

    // If this is a chunk or dynamic import failure, automatically trigger recovery
    if (chunkErrorRecovery.isChunkError(error)) {
      chunkErrorRecovery.handleError(error);
    }
  }

  private handleRetry = async () => {
    // If the error was a chunk or dynamic import failure, re-rendering within
    // React will re-throw the cached rejected promise. Instead, trigger a fresh
    // cache-clearing page reload.
    if (this.state.error && chunkErrorRecovery.isChunkError(this.state.error)) {
      chunkErrorRecovery.reset();
      void chunkErrorRecovery.purgeCachesAndReload();
      return;
    }

    this.setState({ isRetrying: true });

    try {
      await this.props.onRetry?.();
    } catch (retryError) {
      logger.error("ErrorBoundary retry failed", retryError);
    } finally {
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false,
        referenceId: null,
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunk = Boolean(
        this.state.error && chunkErrorRecovery.isChunkError(this.state.error),
      );

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="w-full max-w-md mx-auto">
              <ErrorBanner
                message={
                  isChunk
                    ? "A new version of CineTrekker is available or an update is needed."
                    : "Something went wrong. Please try again."
                }
                actionLabel={
                  this.state.isRetrying
                    ? "Updating..."
                    : isChunk
                      ? "Update & Reload"
                      : "Retry"
                }
                onAction={this.handleRetry}
                className="mb-4"
              >
                {this.state.referenceId ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Reference: {this.state.referenceId}
                  </p>
                ) : null}
              </ErrorBanner>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component for API errors
interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
  requestReference?: string | null;
}

export function ApiError({
  message,
  onRetry,
  requestReference,
}: ApiErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-full max-w-md mx-auto">
        <ErrorBanner
          message={
            message ||
            "We couldn't fetch the data. Please check your connection and try again."
          }
          actionLabel={onRetry ? "Retry" : undefined}
          onAction={onRetry}
        >
          {requestReference ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Reference: {requestReference}
            </p>
          ) : null}
        </ErrorBanner>
      </div>
    </div>
  );
}

// Offline indicator component
export function OfflineIndicator() {
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-fade-in">
      <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
        <span className="text-sm font-medium">You're offline</span>
        <span className="text-sm opacity-80">
          — Some features may be unavailable
        </span>
      </div>
    </div>
  );
}
