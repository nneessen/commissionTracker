// src/components/ui/checkbox.tsx
// Modern checkbox with zinc palette and refined styling

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@radix-ui/react-icons";

const checkboxVariants = cva(
  [
    "peer shrink-0 rounded border-2 transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-zinc-300 bg-white",
          "hover:border-zinc-400 hover:bg-zinc-50",
          "data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 data-[state=checked]:text-white",
          "focus-visible:ring-zinc-900",
          "dark:border-zinc-600 dark:bg-zinc-900",
          "dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
          "dark:data-[state=checked]:bg-zinc-100 dark:data-[state=checked]:border-zinc-100 dark:data-[state=checked]:text-zinc-900",
          "dark:focus-visible:ring-zinc-100",
        ].join(" "),

        primary: [
          "border-zinc-300 bg-white",
          "hover:border-zinc-900",
          "data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 data-[state=checked]:text-white",
          "focus-visible:ring-zinc-900",
          "dark:border-zinc-600 dark:bg-zinc-900",
          "dark:hover:border-zinc-100",
          "dark:data-[state=checked]:bg-zinc-100 dark:data-[state=checked]:border-zinc-100 dark:data-[state=checked]:text-zinc-900",
          "dark:focus-visible:ring-zinc-100",
        ].join(" "),

        success: [
          "border-zinc-300 bg-white",
          "hover:border-emerald-500",
          "data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 data-[state=checked]:text-white",
          "focus-visible:ring-emerald-500",
          "dark:border-zinc-600 dark:bg-zinc-900",
          "dark:hover:border-emerald-400",
          "dark:data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:border-emerald-500",
        ].join(" "),

        destructive: [
          "border-zinc-300 bg-white",
          "hover:border-red-500",
          "data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 data-[state=checked]:text-white",
          "focus-visible:ring-red-500",
          "dark:border-zinc-600 dark:bg-zinc-900",
          "dark:hover:border-red-400",
          "dark:data-[state=checked]:bg-red-500 dark:data-[state=checked]:border-red-500",
        ].join(" "),
      },
      size: {
        sm: "h-3.5 w-3.5",
        default: "h-4 w-4",
        lg: "h-5 w-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const checkIconVariants = cva("", {
  variants: {
    size: {
      sm: "h-3 w-3",
      default: "h-3.5 w-3.5",
      lg: "h-4 w-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface CheckboxProps
  extends
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, variant, size, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(checkboxVariants({ variant, size }), className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <CheckIcon className={cn(checkIconVariants({ size }))} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox, checkboxVariants };
