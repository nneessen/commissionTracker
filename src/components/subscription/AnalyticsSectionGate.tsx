// src/components/subscription/AnalyticsSectionGate.tsx
// Gate component for analytics sections based on subscription tier

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import {
  useAnalyticsSectionAccess,
  type AnalyticsSectionKey,
  ANALYTICS_SECTION_NAMES,
  ANALYTICS_SECTION_TIERS,
} from "@/hooks/subscription";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnalyticsSectionGateProps {
  /** The analytics section key to gate */
  section: AnalyticsSectionKey;
  /** Content to display when user has access */
  children: ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

/**
 * Gates analytics sections based on subscription tier.
 * Shows a compact locked state when user doesn't have access.
 */
export function AnalyticsSectionGate({
  section,
  children,
  className,
}: AnalyticsSectionGateProps) {
  const { hasAccess, isLoading } = useAnalyticsSectionAccess(section);

  // Show children while loading (prevents layout shift)
  if (isLoading) {
    return <>{children}</>;
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show locked state
  const sectionName = ANALYTICS_SECTION_NAMES[section];
  const requiredPlan = ANALYTICS_SECTION_TIERS[section];

  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800",
        "flex flex-col items-center justify-center p-6 min-h-[200px]",
        className,
      )}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        {/* Lock Icon */}
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
          <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
        </div>

        {/* Section Name */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {sectionName}
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Available on{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {requiredPlan}
            </span>{" "}
            plan
          </p>
        </div>

        {/* Upgrade Button */}
        <Link to="/settings" search={{ tab: "billing" }}>
          <Button
            size="sm"
            className="h-7 px-3 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            <Sparkles className="h-3 w-3 mr-1.5" />
            Upgrade to {requiredPlan}
          </Button>
        </Link>
      </div>
    </div>
  );
}
