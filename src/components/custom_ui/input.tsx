// src/components/custom_ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dense Input Component
 *
 * Extends the default shadcn input with:
 * - Smaller height (32px vs 40px)
 * - Denser padding
 * - Consistent focus states
 * - Compact text size
 *
 * Use this for forms in dense layouts.
 * For standard forms, use the default @/components/ui/input
 */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const DenseInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
DenseInput.displayName = "DenseInput";

export { DenseInput };