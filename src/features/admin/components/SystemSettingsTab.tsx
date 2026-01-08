// src/features/admin/components/SystemSettingsTab.tsx

import { Settings } from "lucide-react";

export function SystemSettingsTab() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Settings className="h-10 w-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          System Settings - Coming soon
        </p>
      </div>
    </div>
  );
}
