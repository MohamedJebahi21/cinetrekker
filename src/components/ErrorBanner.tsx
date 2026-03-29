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
        "flex items-center gap-3 rounded-md border border-destructive bg-destructive/90 text-white px-4 py-3 shadow-sm min-h-[56px]",
        className
      )}
    >
      <AlertTriangle className="w-6 h-6 text-white opacity-90 shrink-0" aria-hidden />
      <div className="flex-1 text-left">
        <span className="font-semibold">{message}</span>
        {children}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="ml-4 px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
