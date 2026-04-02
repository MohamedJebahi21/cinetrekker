import * as React from "react";

import { cn } from "@/lib/utils";

type PaginationDotsProps = React.HTMLAttributes<HTMLDivElement>;

const PaginationDots = React.forwardRef<HTMLDivElement, PaginationDotsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-4 flex items-center justify-center gap-2.5", className)}
      {...props}
    />
  ),
);
PaginationDots.displayName = "PaginationDots";

type PaginationDotButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  active?: boolean;
};

function PaginationDotButton({
  className,
  active = false,
  type = "button",
  ...props
}: PaginationDotButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-full border border-border/70 bg-muted-foreground/40 transition-all duration-200",
          "group-hover:bg-muted-foreground/55",
          active &&
            "w-7 border-primary/70 bg-primary shadow-[0_0_0_1px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary)/0.3)]",
        )}
      />
    </button>
  );
}

type PaginationDotStaticProps = React.HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
};

function PaginationDotStatic({ className, active = false, ...props }: PaginationDotStaticProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-full border border-border/70 bg-muted-foreground/40 transition-all duration-200",
          active &&
            "w-7 border-primary/70 bg-primary shadow-[0_0_0_1px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary)/0.3)]",
        )}
      />
    </span>
  );
}

export { PaginationDotButton, PaginationDots, PaginationDotStatic };
