// src/components/ui/badge.tsx
// Modern badge with matching button variants

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Dark badge with strong contrast
        default:
          "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900",

        // Secondary: Light slate with visible background
        secondary:
          "bg-slate-200 text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100",

        // Success: VIBRANT green
        success: "bg-emerald-500 text-white shadow-sm",

        // Warning: VIBRANT amber/orange
        warning: "bg-amber-500 text-white shadow-sm",

        // Destructive: VIBRANT red
        destructive: "bg-red-500 text-white shadow-sm",

        // Info: VIBRANT blue
        info: "bg-blue-500 text-white shadow-sm",

        // Outline: Visible background instead of transparent
        outline:
          "border border-zinc-400 bg-zinc-100 text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200",

        // Ghost: Visible subtle background
        ghost: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",

        // Premium: Gradient amber to orange
        premium:
          "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
