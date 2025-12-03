// src/components/ui/heading.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

export interface HeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  children?: React.ReactNode // For actions/badges on the right
}

const Heading = React.forwardRef<HTMLDivElement, HeadingProps>(
  ({ title, subtitle, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("-mx-3 -mt-3 mb-4", className)} {...props}>
        <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-2 border-b-2 border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {children && (
              <div className="flex items-center gap-1.5">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)
Heading.displayName = "Heading"

export { Heading }