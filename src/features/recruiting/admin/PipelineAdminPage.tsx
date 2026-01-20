// src/features/recruiting/admin/PipelineAdminPage.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { PipelineTemplatesList } from "./PipelineTemplatesList";
import { PipelineTemplateEditor } from "./PipelineTemplateEditor";
import { useIsAdmin } from "@/hooks/permissions";

export function PipelineAdminPage() {
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  // Permission check - only admins can access pipeline administration
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  // Loading state
  if (isAdminLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-3" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="p-6 max-w-sm text-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Access Denied
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4">
            Pipeline administration requires admin privileges.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => navigate({ to: "/recruiting" })}
          >
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            Back to Recruiting
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => navigate({ to: "/recruiting" })}
          >
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            Back to Recruiting
          </Button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pipeline Administration
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {selectedTemplateId ? (
          <PipelineTemplateEditor
            templateId={selectedTemplateId}
            onClose={() => setSelectedTemplateId(null)}
          />
        ) : (
          <PipelineTemplatesList
            onSelectTemplate={(id) => setSelectedTemplateId(id)}
          />
        )}
      </div>
    </div>
  );
}
