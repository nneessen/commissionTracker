// src/components/ui/button.tsx
// Custom button component with shadow-based elevation (no hard borders)

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:from-blue-500 hover:to-blue-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_20px_rgba(59,130,246,0.3)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] data-[active=true]:from-blue-500 data-[active=true]:to-blue-600 data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_12px_rgba(59,130,246,0.4)] transition-all duration-150",
        destructive:
          "bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:from-red-500 hover:to-red-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_20px_rgba(239,68,68,0.3)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] data-[active=true]:from-red-500 data-[active=true]:to-red-600 data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_12px_rgba(239,68,68,0.4)] transition-all duration-150",
        outline:
          "bg-slate-900/50 backdrop-blur-sm text-slate-300 ring-1 ring-slate-700 hover:bg-blue-500/20 hover:text-blue-300 hover:ring-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] active:bg-blue-500/30 data-[active=true]:bg-blue-500/30 data-[active=true]:text-blue-300 data-[active=true]:ring-blue-500 data-[active=true]:shadow-[0_0_16px_rgba(59,130,246,0.3)] transition-all duration-150",
        secondary:
          "bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:from-emerald-500 hover:to-emerald-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_20px_rgba(16,185,129,0.3)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] data-[active=true]:from-emerald-500 data-[active=true]:to-emerald-600 data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_12px_rgba(16,185,129,0.4)] transition-all duration-150",
        ghost:
          "text-slate-400 hover:text-white hover:bg-slate-800/50 active:bg-slate-700/50 data-[active=true]:bg-slate-800/70 data-[active=true]:text-white transition-all duration-150",
        link: "text-blue-400 underline-offset-4 hover:underline hover:text-blue-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
