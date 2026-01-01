// src/features/recruiting/components/InvitationStatusBadge.tsx
// Badge component showing recruit invitation status

import { cn } from "@/lib/utils";
import {
  Clock,
  Mail,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InvitationStatus } from "@/types/recruiting.types";
import {
  INVITATION_STATUS_LABELS,
  INVITATION_STATUS_COLORS,
} from "@/types/recruiting.types";

interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  expiresAt?: string;
  viewedAt?: string;
  completedAt?: string;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const STATUS_ICONS: Record<InvitationStatus, typeof Clock> = {
  pending: Clock,
  sent: Mail,
  viewed: Eye,
  completed: CheckCircle2,
  expired: AlertCircle,
  cancelled: XCircle,
};

export function InvitationStatusBadge({
  status,
  expiresAt,
  viewedAt,
  completedAt,
  className,
  showIcon = true,
  size = "sm",
}: InvitationStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const label = INVITATION_STATUS_LABELS[status];
  const colorClass = INVITATION_STATUS_COLORS[status];

  const getTooltipContent = () => {
    switch (status) {
      case "pending":
        return `Invitation created but not yet sent. ${expiresAt ? `Expires: ${new Date(expiresAt).toLocaleDateString()}` : ""}`;
      case "sent":
        return `Invitation email sent. ${expiresAt ? `Expires: ${new Date(expiresAt).toLocaleDateString()}` : ""}`;
      case "viewed":
        return `Recruit opened the registration form. ${viewedAt ? `Viewed: ${new Date(viewedAt).toLocaleDateString()}` : ""}`;
      case "completed":
        return `Registration completed. ${completedAt ? `Completed: ${new Date(completedAt).toLocaleDateString()}` : ""}`;
      case "expired":
        return `Invitation expired. ${expiresAt ? `Expired: ${new Date(expiresAt).toLocaleDateString()}` : ""} Send a new invitation.`;
      case "cancelled":
        return "Invitation was cancelled.";
      default:
        return label;
    }
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full font-medium",
              sizeClasses[size],
              colorClass,
              className,
            )}
          >
            {showIcon && <Icon className={iconSizes[size]} />}
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for use in tables - just shows icon with tooltip
 */
export function InvitationStatusIcon({
  status,
  expiresAt,
  className,
}: {
  status: InvitationStatus;
  expiresAt?: string;
  className?: string;
}) {
  const Icon = STATUS_ICONS[status];
  const label = INVITATION_STATUS_LABELS[status];
  const colorClass = INVITATION_STATUS_COLORS[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full p-1",
              colorClass,
              className,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {label}
            {status === "sent" &&
              expiresAt &&
              ` • Expires: ${new Date(expiresAt).toLocaleDateString()}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default InvitationStatusBadge;
