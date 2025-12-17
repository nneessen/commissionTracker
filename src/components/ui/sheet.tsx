// src/components/ui/sheet.tsx
// Modern sheet/drawer with zinc palette and refined styling

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import {cva, type VariantProps} from "class-variance-authority"
import {cn} from "@/lib/utils"
import {Cross2Icon} from "@radix-ui/react-icons"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  [
    "fixed z-50 gap-4 p-6 shadow-2xl transition ease-in-out",
    "bg-white dark:bg-zinc-900",
    "data-[state=closed]:duration-300 data-[state=open]:duration-500",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
  ].join(" "),
  {
    variants: {
      side: {
        top: [
          "inset-x-0 top-0 border-b border-zinc-200 dark:border-zinc-800",
          "rounded-b-xl",
          "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        ].join(" "),
        bottom: [
          "inset-x-0 bottom-0 border-t border-zinc-200 dark:border-zinc-800",
          "rounded-t-xl",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        ].join(" "),
        left: [
          "inset-y-0 left-0 h-full w-3/4 border-r border-zinc-200 dark:border-zinc-800 sm:max-w-sm",
          "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        ].join(" "),
        right: [
          "inset-y-0 right-0 h-full w-3/4 border-l border-zinc-200 dark:border-zinc-800 sm:max-w-sm",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        ].join(" "),
      },
      size: {
        sm: "",
        default: "",
        lg: "",
        xl: "",
        full: "",
      },
    },
    compoundVariants: [
      // Right side sizes
      { side: "right", size: "sm", className: "sm:max-w-xs" },
      { side: "right", size: "default", className: "sm:max-w-sm" },
      { side: "right", size: "lg", className: "sm:max-w-lg" },
      { side: "right", size: "xl", className: "sm:max-w-2xl" },
      { side: "right", size: "full", className: "sm:max-w-full" },
      // Left side sizes
      { side: "left", size: "sm", className: "sm:max-w-xs" },
      { side: "left", size: "default", className: "sm:max-w-sm" },
      { side: "left", size: "lg", className: "sm:max-w-lg" },
      { side: "left", size: "xl", className: "sm:max-w-2xl" },
      { side: "left", size: "full", className: "sm:max-w-full" },
      // Top/Bottom sizes (height-based)
      { side: "top", size: "sm", className: "max-h-[25vh]" },
      { side: "top", size: "default", className: "max-h-[40vh]" },
      { side: "top", size: "lg", className: "max-h-[60vh]" },
      { side: "top", size: "xl", className: "max-h-[80vh]" },
      { side: "top", size: "full", className: "max-h-screen" },
      { side: "bottom", size: "sm", className: "max-h-[25vh]" },
      { side: "bottom", size: "default", className: "max-h-[40vh]" },
      { side: "bottom", size: "lg", className: "max-h-[60vh]" },
      { side: "bottom", size: "xl", className: "max-h-[80vh]" },
      { side: "bottom", size: "full", className: "max-h-screen" },
    ],
    defaultVariants: {
      side: "right",
      size: "default",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideCloseButton?: boolean
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", size, className, children, hideCloseButton, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side, size }), className)}
      {...props}
    >
      {!hideCloseButton && (
        <SheetPrimitive.Close
          className={cn(
            "absolute right-4 top-4 rounded-md p-1",
            "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
            "dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2",
            "dark:focus:ring-zinc-100",
            "disabled:pointer-events-none"
          )}
        >
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold text-zinc-900 dark:text-zinc-100",
      className
    )}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  sheetVariants,
}
