// src/components/ui/switch.tsx
// Modern switch/toggle with zinc palette and refined styling

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const switchVariants = cva(
  [
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "dark:focus-visible:ring-offset-zinc-950",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700",
          "data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100",
          "focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100",
        ].join(" "),

        success: [
          "data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700",
          "data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500",
          "focus-visible:ring-emerald-500",
        ].join(" "),

        warning: [
          "data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700",
          "data-[state=checked]:bg-amber-500 dark:data-[state=checked]:bg-amber-400",
          "focus-visible:ring-amber-500",
        ].join(" "),

        destructive: [
          "data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700",
          "data-[state=checked]:bg-red-600 dark:data-[state=checked]:bg-red-500",
          "focus-visible:ring-red-500",
        ].join(" "),
      },
      size: {
        sm: "h-4 w-7",
        default: "h-5 w-9",
        lg: "h-6 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const thumbVariants = cva(
  [
    "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform",
    "dark:bg-zinc-900 dark:data-[state=checked]:bg-zinc-900",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "dark:data-[state=checked]:bg-zinc-900",
        success: "",
        warning: "",
        destructive: "",
      },
      size: {
        sm: "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
        default:
          "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        lg: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface SwitchProps
  extends
    React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, variant, size, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchVariants({ variant, size }), className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className={cn(thumbVariants({ variant, size }))} />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch, switchVariants };
