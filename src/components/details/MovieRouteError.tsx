import { ApiError } from '@/components/ErrorBoundary';

interface MovieRouteErrorProps {
  message: string;
  onRetry: () => void;
  requestReference?: string | null;
}

export function MovieRouteError({
  message,
  onRetry,
  requestReference,
}: MovieRouteErrorProps) {
  return (
    <div className="page-container text-center py-16">
      <ApiError
        message={message}
        onRetry={onRetry}
        requestReference={requestReference}
      />
    </div>
  );
}
