import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => Promise<void> | void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isRetrying: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = async () => {
    this.setState({ isRetrying: true });

    try {
      await this.props.onRetry?.();
    } catch (retryError) {
      console.error('ErrorBoundary retry failed:', retryError);
    } finally {
      this.setState({ hasError: false, error: null, isRetrying: false });
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Something went wrong. Retry.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={this.handleRetry} disabled={this.state.isRetrying}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {this.state.isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            </div>
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
}

export function ApiError({ message, onRetry }: ApiErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="font-semibold mb-2">Failed to load content</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {message || "We couldn't fetch the data. Please check your connection and try again."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Offline indicator component
export function OfflineIndicator() {
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-fade-in">
      <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
        <span className="text-sm font-medium">You're offline</span>
        <span className="text-sm opacity-80">— Some features may be unavailable</span>
      </div>
    </div>
  );
}
