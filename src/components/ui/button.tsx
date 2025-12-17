// src/components/ui/button.tsx
// Custom button component - black/white theme with visible hover/active effects

import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors transition-shadow transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        // Default: Black button - lightens on hover, darkens on click
        default:
          "bg-foreground text-background shadow-md hover:bg-foreground/80 hover:shadow-lg hover:scale-[1.02] active:bg-foreground/70 active:shadow-sm active:scale-[0.98]",

        // Primary: Same as default
        primary:
          "bg-foreground text-background shadow-md hover:bg-foreground/80 hover:shadow-lg hover:scale-[1.02] active:bg-foreground/70 active:shadow-sm active:scale-[0.98]",

        // Secondary: Gray background
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/70 hover:shadow-lg hover:scale-[1.02] active:bg-secondary/60 active:shadow-sm active:scale-[0.98]",

        // Success: Green
        success:
          "bg-[var(--success)] text-white shadow-md hover:brightness-110 hover:shadow-lg hover:scale-[1.02] active:brightness-90 active:shadow-sm active:scale-[0.98]",

        // Warning: Amber
        warning:
          "bg-[var(--warning)] text-white shadow-md hover:brightness-110 hover:shadow-lg hover:scale-[1.02] active:brightness-90 active:shadow-sm active:scale-[0.98]",

        // Destructive: Red
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/80 hover:shadow-lg hover:scale-[1.02] active:bg-destructive/70 active:shadow-sm active:scale-[0.98]",

        // Outline: Bordered - fills on hover
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:scale-[1.02] active:bg-accent/80 active:shadow-sm active:scale-[0.98]",

        // Ghost: No background - appears on hover
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-sm active:bg-accent/70 active:scale-[0.98]",

        // Muted: Subtle gray background
        muted:
          "bg-muted text-muted-foreground shadow-sm hover:bg-muted/70 hover:text-foreground hover:shadow-md active:bg-muted/60 active:shadow-sm active:scale-[0.98]",

        // Link: Underline on hover
        link:
          "text-foreground underline-offset-4 hover:underline hover:text-foreground/80 active:text-foreground/60",
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
