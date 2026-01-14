// src/features/admin/components/SystemSettingsTab.tsx

import { Zap } from "lucide-react";
import { SystemAutomationsConfig } from "./SystemAutomationsConfig";

export function SystemSettingsTab() {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* System Automations Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                System Automations
              </h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Configure automated communications for system-level events
              </p>
            </div>
          </div>
          <SystemAutomationsConfig />
        </section>
      </div>
    </div>
  );
}
