// src/components/ui/textarea.tsx
// Modern textarea with zinc palette and refined styling

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  [
    "flex w-full rounded-lg text-sm transition-all duration-200",
    "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border border-zinc-200 bg-white",
          "hover:border-zinc-300 hover:bg-zinc-50",
          "focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10",
          "dark:border-zinc-700 dark:bg-zinc-900",
          "dark:hover:border-zinc-600 dark:hover:bg-zinc-800",
          "dark:focus:border-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-zinc-100/10",
        ].join(" "),

        filled: [
          "border-transparent bg-zinc-100",
          "hover:bg-zinc-200",
          "focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10",
          "dark:bg-zinc-800",
          "dark:hover:bg-zinc-700",
          "dark:focus:bg-zinc-900 dark:focus:border-zinc-600 dark:focus:ring-zinc-100/10",
        ].join(" "),

        ghost: [
          "border-transparent bg-transparent",
          "hover:bg-zinc-100",
          "focus:bg-zinc-50 focus:ring-2 focus:ring-zinc-900/10",
          "dark:hover:bg-zinc-800",
          "dark:focus:bg-zinc-900 dark:focus:ring-zinc-100/10",
        ].join(" "),

        error: [
          "border-2 border-red-300 bg-red-50",
          "hover:border-red-400",
          "focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20",
          "dark:border-red-700 dark:bg-red-950/20",
          "dark:hover:border-red-600",
          "dark:focus:border-red-500 dark:focus:bg-zinc-900",
        ].join(" "),
      },
      textSize: {
        sm: "text-xs min-h-[60px] px-2.5 py-1.5",
        default: "text-sm min-h-[80px] px-3 py-2",
        lg: "text-base min-h-[100px] px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      textSize: "default",
    },
  },
);

interface TextareaProps
  extends
    React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, textSize, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, textSize }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
