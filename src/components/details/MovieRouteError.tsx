import { ApiError } from '@/components/ErrorBoundary';

interface MovieRouteErrorProps {
  message: string;
  onRetry: () => void;
}

export function MovieRouteError({ message, onRetry }: MovieRouteErrorProps) {
  return (
    <div className="page-container text-center py-16">
      <ApiError message={message} onRetry={onRetry} />
    </div>
  );
}
