// src/components/ui/button.tsx
// Custom button component - black/white theme with hover/active effects

import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default: Black button with elevation on hover, press effect on click
        default:
          "bg-foreground text-background shadow-sm hover:bg-foreground/90 hover:shadow-md hover:-translate-y-px active:bg-foreground/80 active:shadow-none active:translate-y-0",

        // Primary: Same as default (alias for semantic clarity)
        primary:
          "bg-foreground text-background shadow-sm hover:bg-foreground/90 hover:shadow-md hover:-translate-y-px active:bg-foreground/80 active:shadow-none active:translate-y-0",

        // Secondary: Muted background with hover lift
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:-translate-y-px active:bg-secondary/70 active:shadow-none active:translate-y-0",

        // Success: Green with hover/active effects
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shadow-sm hover:brightness-110 hover:shadow-md hover:-translate-y-px active:brightness-90 active:shadow-none active:translate-y-0",

        // Warning: Amber with hover/active effects
        warning:
          "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] shadow-sm hover:brightness-110 hover:shadow-md hover:-translate-y-px active:brightness-90 active:shadow-none active:translate-y-0",

        // Destructive: Red with hover/active effects
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md hover:-translate-y-px active:bg-destructive/80 active:shadow-none active:translate-y-0",

        // Outline: Border with fill on hover
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:-translate-y-px active:bg-accent/80 active:shadow-none active:translate-y-0",

        // Ghost: Transparent with background on hover
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80",

        // Muted: Subtle background
        muted:
          "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted/70",

        // Link: Text-only with underline on hover
        link:
          "text-foreground underline-offset-4 hover:underline active:opacity-80",
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
