// src/features/recruiting/admin/PipelineAdminPage.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
// import {Card} from '@/components/ui/card';
import { Settings2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { PipelineTemplatesList } from "./PipelineTemplatesList";
import { PipelineTemplateEditor } from "./PipelineTemplateEditor";
import { ArrowLeft } from "lucide-react";

export function PipelineAdminPage() {
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/recruiting" })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recruiting
          </Button>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Pipeline Administration</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
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
