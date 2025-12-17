// src/components/ui/alert.tsx
// Modern alert with zinc palette and multiple semantic variants

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "relative w-full rounded-lg border px-4 py-3 text-sm",
    "[&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-white border-zinc-200 text-zinc-900",
          "[&>svg]:text-zinc-600",
          "dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100",
          "dark:[&>svg]:text-zinc-400",
        ].join(" "),

        muted: [
          "bg-zinc-100 border-zinc-200 text-zinc-700",
          "[&>svg]:text-zinc-500",
          "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300",
          "dark:[&>svg]:text-zinc-400",
        ].join(" "),

        info: [
          "bg-blue-50 border-blue-200 text-blue-900",
          "[&>svg]:text-blue-600",
          "dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100",
          "dark:[&>svg]:text-blue-400",
        ].join(" "),

        success: [
          "bg-emerald-50 border-emerald-200 text-emerald-900",
          "[&>svg]:text-emerald-600",
          "dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100",
          "dark:[&>svg]:text-emerald-400",
        ].join(" "),

        warning: [
          "bg-amber-50 border-amber-200 text-amber-900",
          "[&>svg]:text-amber-600",
          "dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100",
          "dark:[&>svg]:text-amber-400",
        ].join(" "),

        destructive: [
          "bg-red-50 border-red-200 text-red-900",
          "[&>svg]:text-red-600",
          "dark:bg-red-950/30 dark:border-red-800 dark:text-red-100",
          "dark:[&>svg]:text-red-400",
        ].join(" "),

        outline: [
          "bg-transparent border-zinc-300 text-zinc-900",
          "[&>svg]:text-zinc-600",
          "dark:border-zinc-700 dark:text-zinc-100",
          "dark:[&>svg]:text-zinc-400",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
