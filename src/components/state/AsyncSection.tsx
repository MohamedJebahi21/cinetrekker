import type { ReactNode } from 'react';

interface AsyncSectionProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty: boolean;
  loadingFallback: ReactNode;
  emptyFallback: ReactNode;
  children: ReactNode;
}

export function AsyncSection({
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  loadingFallback,
  emptyFallback,
  children,
}: AsyncSectionProps) {
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert" aria-live="polite">
        {errorMessage || 'Something went wrong.'}
      </div>
    );
  }

  if (isEmpty) {
    return <>{emptyFallback}</>;
  }

  return <>{children}</>;
}
