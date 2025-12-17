// src/components/ui/input.tsx
// Modern input with sleek focus states

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full text-sm transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default: Clean with subtle background
        default:
          "h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2 text-foreground focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-2 focus:ring-offset-background",

        // Minimal: Underline style
        minimal:
          "h-9 bg-transparent border-b-2 border-zinc-300 dark:border-zinc-700 rounded-none px-1 py-2 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none",

        // Filled: Darker background
        filled:
          "h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700 px-3 py-2 focus:bg-zinc-100 dark:focus:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100",

        // Ghost: Transparent until focus
        ghost:
          "h-9 rounded-lg bg-transparent px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100",

        // Outlined: Border style
        outlined:
          "h-9 rounded-lg bg-transparent border-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none",
      },
      inputSize: {
        default: "h-9",
        sm: "h-8 text-xs",
        lg: "h-11 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
