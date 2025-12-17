// src/components/ui/button.tsx
// Custom button component with shadow-based elevation (no hard borders except outline)

import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default: Neutral slate button that highlights blue on hover
        default:
          "bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-sm hover:from-blue-500 hover:to-blue-600 hover:shadow-md hover:shadow-blue-500/20 active:shadow-inner data-[active=true]:from-blue-500 data-[active=true]:to-blue-600 data-[active=true]:shadow-blue-500/30",

        // Primary: Always blue - use for main CTAs
        primary:
          "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/20 hover:from-blue-400 hover:to-blue-500 hover:shadow-md hover:shadow-blue-500/30 active:shadow-inner data-[active=true]:from-blue-400 data-[active=true]:to-blue-500",

        // Secondary: Emerald/green on hover - use for secondary actions
        secondary:
          "bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-sm hover:from-emerald-500 hover:to-emerald-600 hover:shadow-md hover:shadow-emerald-500/20 active:shadow-inner data-[active=true]:from-emerald-500 data-[active=true]:to-emerald-600",

        // Success: Always green - use for positive confirmations
        success:
          "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-md hover:shadow-emerald-500/30 active:shadow-inner",

        // Warning: Amber/yellow - use for caution actions
        warning:
          "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 hover:shadow-md hover:shadow-amber-500/30 active:shadow-inner",

        // Destructive: Red on hover, red when active - use for delete/remove
        destructive:
          "bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md hover:shadow-red-500/20 active:shadow-inner data-[active=true]:from-red-500 data-[active=true]:to-red-600 data-[active=true]:shadow-red-500/30",

        // Outline: Has border (ring) - only variant with visible border
        outline:
          "bg-slate-900/50 backdrop-blur-sm text-slate-300 ring-1 ring-slate-700 hover:bg-blue-500/20 hover:text-blue-300 hover:ring-blue-500/50 hover:shadow-md hover:shadow-blue-500/10 active:bg-blue-500/30 data-[active=true]:bg-blue-500/30 data-[active=true]:text-blue-300 data-[active=true]:ring-blue-500",

        // Ghost: Transparent, subtle hover - use for toolbar buttons
        ghost:
          "text-slate-400 hover:text-white hover:bg-slate-800/50 active:bg-slate-700/50 data-[active=true]:bg-slate-800/70 data-[active=true]:text-white",

        // Muted: Subtle muted background - use for less prominent actions
        muted:
          "bg-slate-800/50 text-slate-300 hover:bg-slate-700/70 hover:text-white active:bg-slate-700 data-[active=true]:bg-slate-700 data-[active=true]:text-white",

        // Link: Text-only with underline
        link: "text-blue-400 underline-offset-4 hover:underline hover:text-blue-300",
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
