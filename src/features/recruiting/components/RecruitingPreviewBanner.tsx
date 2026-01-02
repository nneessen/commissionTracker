// src/features/recruiting/components/RecruitingPreviewBanner.tsx
// Banner displayed to non-admin users indicating the recruiting pipeline is still in development

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecruitingPreviewBannerProps {
  className?: string;
}

/**
 * Warning banner displayed at the top of the recruiting dashboard
 * to inform users that the feature is still under development.
 *
 * This banner is NOT shown to the super admin (nickneessen@thestandardhq.com).
 */
export function RecruitingPreviewBanner({
  className,
}: RecruitingPreviewBannerProps) {
  return (
    <div
      className={cn(
        "bg-amber-500/10 border border-amber-500/30 rounded-md px-4 py-3 mb-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Preview Feature - Not Ready for Production Use
          </h3>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
            The Recruiting Pipeline is still under active development. Some
            features may not work as expected, and data entered here may be
            modified or reset. Please do not rely on this feature for critical
            workflows until this message is removed.
          </p>
        </div>
      </div>
    </div>
  );
}
