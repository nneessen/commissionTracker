// src/components/ui/tabs.tsx
// Modern tabs with prominent visual grouping and zinc palette

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva(
  "inline-flex items-center gap-1 p-1 transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Strong container background with border
        default:
          "rounded-lg bg-zinc-200 border border-zinc-300 shadow-inner dark:bg-zinc-800 dark:border-zinc-700",

        // Pill: Rounded pill style with prominent container
        pill: "rounded-full bg-zinc-200 border border-zinc-300 shadow-inner dark:bg-zinc-800 dark:border-zinc-700",

        // Underline: Bottom border style (no container)
        underline:
          "bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 rounded-none p-0 gap-0",

        // Boxed: Card-like container
        boxed:
          "rounded-lg bg-zinc-100 border-2 border-zinc-300 shadow-md dark:bg-zinc-900 dark:border-zinc-700",

        // Segment: iOS-style segmented control
        segment:
          "rounded-lg bg-zinc-200/80 border border-zinc-300 shadow-sm backdrop-blur-sm dark:bg-zinc-800/80 dark:border-zinc-700",
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "rounded-md px-4 py-1.5",
          "text-zinc-600 dark:text-zinc-400",
          "hover:text-zinc-900 hover:bg-zinc-300/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50",
          "data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-zinc-200",
          "dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100 dark:data-[state=active]:border-zinc-700",
        ].join(" "),

        pill: [
          "rounded-full px-4 py-1.5",
          "text-zinc-600 dark:text-zinc-400",
          "hover:text-zinc-900 hover:bg-zinc-300/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50",
          "data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-md",
          "dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100",
        ].join(" "),

        underline: [
          "px-4 py-2 -mb-[2px] rounded-none border-b-2 border-transparent",
          "text-zinc-500 dark:text-zinc-400",
          "hover:text-zinc-900 hover:border-zinc-300 dark:hover:text-zinc-100 dark:hover:border-zinc-600",
          "data-[state=active]:text-zinc-900 data-[state=active]:border-zinc-900",
          "dark:data-[state=active]:text-zinc-100 dark:data-[state=active]:border-zinc-100",
        ].join(" "),

        boxed: [
          "rounded-md px-4 py-1.5",
          "text-zinc-600 dark:text-zinc-400",
          "hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-zinc-100 dark:hover:bg-zinc-800",
          "data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:shadow-lg",
          "dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900",
        ].join(" "),

        segment: [
          "rounded-md px-4 py-1.5 flex-1",
          "text-zinc-600 dark:text-zinc-400",
          "hover:text-zinc-900 dark:hover:text-zinc-100",
          "data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-md data-[state=active]:font-semibold",
          "dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100",
        ].join(" "),
      },
      size: {
        sm: "text-xs px-3 py-1",
        default: "text-sm px-4 py-1.5",
        lg: "text-base px-5 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface TabsListProps
  extends
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant, size }), className)}
    data-variant={variant}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps
  extends
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant, size }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100",
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=active]:animate-in data-[state=active]:fade-in-0",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
};
