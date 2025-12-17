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
        // Default: Black -> Gray on hover -> Darker on click
        default:
          "bg-zinc-900 text-white shadow-md hover:bg-zinc-700 hover:shadow-lg hover:scale-[1.02] active:bg-zinc-950 active:shadow-sm active:scale-[0.98]",

        // Primary: Same visual as default
        primary:
          "bg-zinc-900 text-white shadow-md hover:bg-zinc-700 hover:shadow-lg hover:scale-[1.02] active:bg-zinc-950 active:shadow-sm active:scale-[0.98]",

        // Secondary: Light gray -> Darker gray on hover
        secondary:
          "bg-zinc-200 text-zinc-900 shadow-md hover:bg-zinc-300 hover:shadow-lg hover:scale-[1.02] active:bg-zinc-400 active:shadow-sm active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-900",

        // Success: Green with visible shift
        success:
          "bg-emerald-600 text-white shadow-md hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:bg-emerald-700 active:shadow-sm active:scale-[0.98]",

        // Warning: Amber with visible shift
        warning:
          "bg-amber-500 text-white shadow-md hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:bg-amber-600 active:shadow-sm active:scale-[0.98]",

        // Destructive: Red with visible shift
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:bg-red-700 active:shadow-sm active:scale-[0.98]",

        // Outline: Transparent -> Filled on hover
        outline:
          "border-2 border-zinc-300 bg-transparent text-foreground hover:bg-zinc-100 hover:border-zinc-400 hover:shadow-md hover:scale-[1.02] active:bg-zinc-200 active:scale-[0.98] dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 dark:active:bg-zinc-900",

        // Ghost: Invisible -> Visible on hover
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-zinc-100 hover:shadow-sm active:bg-zinc-200 active:scale-[0.98] dark:hover:bg-zinc-800 dark:active:bg-zinc-900",

        // Muted: Soft gray background
        muted:
          "bg-zinc-300 text-zinc-600 shadow-sm hover:bg-zinc-200 hover:text-zinc-900 hover:shadow-md active:bg-zinc-300 active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:active:bg-zinc-900",

        // Link: Text with underline animation
        link: "text-foreground underline-offset-4 hover:underline hover:text-zinc-600 active:text-zinc-400 dark:hover:text-zinc-300 dark:active:text-zinc-500",
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
