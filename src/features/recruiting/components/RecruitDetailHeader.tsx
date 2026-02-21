// src/features/recruiting/components/RecruitDetailHeader.tsx
import type { UserProfile } from "@/types/hierarchy.types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone } from "lucide-react";
import { TERMINAL_STATUS_COLORS } from "@/types/recruiting.types";
import { cn } from "@/lib/utils";

interface RecruitDetailHeaderProps {
  recruit: UserProfile;
  displayName: string;
  initials: string;
}

export function RecruitDetailHeader({
  recruit,
  displayName,
  initials,
}: RecruitDetailHeaderProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={recruit.profile_photo_url || undefined} />
        <AvatarFallback className="text-xs font-medium bg-zinc-200 dark:bg-zinc-700">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {displayName}
          </h2>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              recruit.onboarding_status
                ? TERMINAL_STATUS_COLORS[recruit.onboarding_status] ||
                    "bg-blue-100 text-blue-800"
                : "",
            )}
          >
            {recruit.onboarding_status?.replace(/_/g, " ") || "New"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {recruit.email && (
            <a
              href={`mailto:${recruit.email}`}
              className="flex items-center gap-0.5 hover:text-zinc-700 dark:hover:text-zinc-300 truncate"
            >
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[140px]">{recruit.email}</span>
            </a>
          )}
          {recruit.phone && (
            <a
              href={`tel:${recruit.phone}`}
              className="flex items-center gap-0.5 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <Phone className="h-3 w-3" />
              {recruit.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
