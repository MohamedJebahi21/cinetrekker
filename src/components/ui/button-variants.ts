import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium min-h-12 min-w-12 ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:translate-y-[-1px] hover:shadow-md active:translate-y-[0px] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-[0_12px_24px_hsl(356_84%_44%/0.22)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92 hover:shadow-[0_12px_24px_hsl(var(--destructive)/0.18)] focus-visible:ring-red-500/50 focus-visible:ring-offset-2",
        outline:
          "border border-border/60 bg-transparent hover:bg-white/5 hover:border-border hover:shadow-[0_10px_20px_hsl(var(--foreground)/0.06)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/85 hover:shadow-[0_10px_20px_hsl(var(--foreground)/0.06)]",
        ghost:
          "hover:bg-white/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
