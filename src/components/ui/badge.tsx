// src/components/ui/badge.tsx
// Modern badge with matching button variants

import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"
import {cn} from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Black/dark badge
        default:
          "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",

        // Secondary: Subtle gray
        secondary:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",

        // Success: Green
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",

        // Warning: Amber
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",

        // Destructive: Red
        destructive:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

        // Info: Blue
        info:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",

        // Outline: Border only
        outline:
          "bg-transparent border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",

        // Ghost: Very subtle
        ghost:
          "bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",

        // Premium: Gradient effect
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
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
