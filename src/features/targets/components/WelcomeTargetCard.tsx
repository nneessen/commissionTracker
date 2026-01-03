// src/features/targets/components/WelcomeTargetCard.tsx

import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeTargetCardProps {
  targetYear: number;
  onGetStarted: () => void;
}

/**
 * Welcome card shown to first-time users who haven't set an income target yet.
 * Styled to match the application's compact, professional design language.
 */
export function WelcomeTargetCard({
  targetYear,
  onGetStarted,
}: WelcomeTargetCardProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 max-w-sm w-full shadow-sm">
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="p-2.5 bg-muted rounded-full">
            <Target className="h-5 w-5 text-foreground" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-1.5">
          Set Your {targetYear} Income Target
        </h2>

        {/* Description */}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center mb-4 leading-relaxed">
          Enter your annual net income goal to get started. We'll automatically
          calculate monthly, weekly, and daily targets based on your historical
          performance data.
        </p>

        {/* CTA Button */}
        <Button onClick={onGetStarted} className="w-full h-8 text-[11px]">
          <Target className="h-3.5 w-3.5 mr-1.5" />
          Get Started
        </Button>

        {/* Helper text */}
        <p className="text-[10px] text-muted-foreground text-center mt-2.5">
          You can adjust your target anytime from this page
        </p>
      </div>
    </div>
  );
}
