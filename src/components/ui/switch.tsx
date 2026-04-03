import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "ct-switch peer inline-flex h-9 w-[4.5rem] shrink-0 cursor-pointer items-center rounded-full border-0 bg-[#BFC1C6] p-0.5 transition-colors duration-300 ease-out data-[state=checked]:bg-[#FF0000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "ct-switch-thumb pointer-events-none block h-8 w-8 rounded-full bg-[#F4F5F7] ring-0 shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
