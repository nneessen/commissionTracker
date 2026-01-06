// src/features/messages/components/settings/NotConnectedState.tsx
// Shared empty state for disconnected integrations

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotConnectedStateProps {
  icon: LucideIcon;
  platform: string;
  onConnect?: () => void;
}

export function NotConnectedState({
  icon: Icon,
  platform,
  onConnect,
}: NotConnectedStateProps) {
  return (
    <div className="text-center py-6">
      <Icon className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        No {platform} account connected
      </p>
      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
        Connect {platform} in Settings → Integrations
      </p>
      {onConnect && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] mt-3"
          onClick={onConnect}
        >
          <Icon className="h-3 w-3 mr-1.5" />
          Connect {platform}
        </Button>
      )}
    </div>
  );
}
