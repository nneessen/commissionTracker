// src/components/custom_ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dense Card Components
 *
 * Extends the default shadcn card with:
 * - Tighter padding (12px vs 24px)
 * - Subtle shadows for depth
 * - Consistent border radius
 * - Hover states for interactive cards
 *
 * Use these for high-density layouts where space is premium.
 * For standard layouts, use the default @/components/ui/card
 */

const DenseCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { clickable?: boolean }
>(({ className, clickable = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-md border bg-card text-card-foreground shadow-sm transition-all duration-150",
      clickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
      className
    )}
    {...props}
  />
));
DenseCard.displayName = "DenseCard";

const DenseCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-3", className)}
    {...props}
  />
));
DenseCardHeader.displayName = "DenseCardHeader";

const DenseCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DenseCardTitle.displayName = "DenseCardTitle";

const DenseCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
DenseCardDescription.displayName = "DenseCardDescription";

const DenseCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-3 pt-0", className)} {...props} />
));
DenseCardContent.displayName = "DenseCardContent";

const DenseCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-3 pt-0", className)}
    {...props}
  />
));
DenseCardFooter.displayName = "DenseCardFooter";

export {
  DenseCard,
  DenseCardHeader,
  DenseCardFooter,
  DenseCardTitle,
  DenseCardDescription,
  DenseCardContent,
};