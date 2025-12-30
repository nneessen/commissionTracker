// src/features/workflows/components/WorkflowAdminPage.tsx

import { Settings } from "lucide-react";
import WorkflowManager from "./WorkflowManager";

export default function WorkflowAdminPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Workflow Administration
          </h1>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <WorkflowManager />
      </div>
    </div>
  );
}
