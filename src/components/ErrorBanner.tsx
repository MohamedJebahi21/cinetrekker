import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Accessible error banner with AA contrast and icon
 */
export function ErrorBanner({
  message,
  actionLabel,
  onAction,
  className = "",
  children,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[64px] items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive shadow-[0_16px_48px_hsl(var(--destructive)/0.12)] sm:items-center",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive sm:mt-0" aria-hidden />
      <div className="flex-1 text-left">
        <span className="text-sm font-semibold leading-6 text-foreground">{message}</span>
        {children}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-10 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive transition hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
