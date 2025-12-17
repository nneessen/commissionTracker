// src/components/ui/button.tsx
// Custom button component - black/white theme with subtle styling

import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default: Black/dark button with subtle depth
        default:
          "bg-foreground text-background shadow-sm hover:bg-foreground/90 active:bg-foreground/80 active:shadow-none",

        // Primary: Same as default but with slight glow on hover
        primary:
          "bg-foreground text-background shadow-sm hover:bg-foreground/90 hover:shadow-md active:bg-foreground/80 active:shadow-none",

        // Secondary: Muted background
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70",

        // Success: Green using theme color
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shadow-sm hover:opacity-90 active:opacity-80",

        // Warning: Amber using theme color
        warning:
          "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] shadow-sm hover:opacity-90 active:opacity-80",

        // Destructive: Red using theme color
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/80",

        // Outline: Border with transparent bg
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground active:bg-accent/80",

        // Ghost: No background, subtle hover
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80",

        // Muted: Subtle muted background
        muted:
          "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted/70",

        // Link: Text-only with underline
        link: "text-foreground underline-offset-4 hover:underline",
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
