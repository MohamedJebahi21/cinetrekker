import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium min-h-12 min-w-12 ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-[1.05] hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_10px_24px_hsl(358_94%_46%/0.24)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_10px_24px_hsl(var(--destructive)/0.2)] focus-visible:ring-red-500/50 focus-visible:ring-offset-2",
        outline:
          "border border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20 hover:shadow-[0_8px_20px_hsl(var(--foreground)/0.08)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_8px_20px_hsl(var(--foreground)/0.08)]",
        ghost:
          "hover:bg-white/5 hover:text-foreground hover:shadow-[0_8px_20px_hsl(var(--foreground)/0.06)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-11 rounded-md px-4",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
