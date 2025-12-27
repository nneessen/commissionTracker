// src/components/ui/button.tsx
// Custom button component with distinctive hover/active effects

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        // Default: Dark button with good contrast
        default:
          "bg-zinc-900 text-white shadow-md hover:bg-zinc-700 hover:shadow-lg active:bg-zinc-950 active:shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",

        // Primary: Same as default
        primary:
          "bg-zinc-900 text-white shadow-md hover:bg-zinc-700 hover:shadow-lg active:bg-zinc-950 active:shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",

        // Secondary: Light blue/slate with strong contrast
        secondary:
          "bg-blue-100 text-blue-900 shadow-md hover:bg-blue-200 hover:shadow-lg active:bg-blue-300 active:shadow-sm dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800",

        // Success: VIBRANT green that stands out
        success:
          "bg-emerald-500 text-white shadow-md hover:bg-emerald-600 hover:shadow-lg active:bg-emerald-700 active:shadow-sm",

        // Warning: VIBRANT amber/orange that stands out
        warning:
          "bg-amber-500 text-white shadow-md hover:bg-amber-600 hover:shadow-lg active:bg-amber-700 active:shadow-sm",

        // Destructive: VIBRANT red that stands out
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg active:bg-red-800 active:shadow-sm",

        // Outline: Border with colored background on hover
        outline:
          "border-2 border-zinc-400 bg-white text-zinc-900 shadow hover:bg-zinc-100 hover:border-zinc-500 hover:shadow-md active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700",

        // Ghost: VISIBLE background instead of transparent
        ghost:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 hover:shadow-sm active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",

        // Muted: Subtle but visible
        muted:
          "bg-zinc-200 text-zinc-700 shadow-sm hover:bg-zinc-300 hover:text-zinc-900 hover:shadow-md active:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600",

        // Link: Text with underline
        link: "text-zinc-900 underline-offset-4 hover:underline hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        xs: "h-6 rounded px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
