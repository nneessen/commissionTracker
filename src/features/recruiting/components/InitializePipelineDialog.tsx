// src/features/recruiting/components/InitializePipelineDialog.tsx
// Dialog for selecting a pipeline template when initializing recruit progress

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileStack } from "lucide-react";
import { useTemplates } from "../hooks/usePipeline";
import type { PipelineTemplate } from "@/types/recruiting.types";

interface InitializePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (templateId: string) => void;
  isLoading?: boolean;
}

export function InitializePipelineDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: InitializePipelineDialogProps) {
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  // Set default template when templates load
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplateId) {
      // Prefer the default template, otherwise pick the first one
      const defaultTemplate = templates.find((t) => t.is_default);
      setSelectedTemplateId(defaultTemplate?.id || templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const handleConfirm = () => {
    if (selectedTemplateId) {
      onConfirm(selectedTemplateId);
    }
  };

  // Auto-confirm if only one template exists
  useEffect(() => {
    if (open && templates && templates.length === 1 && !isLoading) {
      // If only one template, auto-select and confirm
      onConfirm(templates[0].id);
    }
  }, [open, templates, isLoading, onConfirm]);

  // Don't render dialog if only one template (auto-confirmed above)
  if (templates && templates.length === 1) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-blue-600" />
            Select Pipeline Template
          </DialogTitle>
          <DialogDescription>
            Choose which pipeline template to use for this recruit.
          </DialogDescription>
        </DialogHeader>

        {templatesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : templates && templates.length > 0 ? (
          <RadioGroup
            value={selectedTemplateId || ""}
            onValueChange={setSelectedTemplateId}
            className="space-y-2"
          >
            {templates.map((template: PipelineTemplate) => (
              <div
                key={template.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedTemplateId === template.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <RadioGroupItem value={template.id} id={template.id} />
                <Label
                  htmlFor={template.id}
                  className="flex-1 cursor-pointer space-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{template.name}</span>
                    {template.is_default && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {template.description}
                    </p>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="py-8 text-center">
            <FileStack className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No pipeline templates found</p>
            <p className="text-xs text-zinc-400 mt-1">
              Create a template in Pipeline Admin first.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTemplateId || isLoading || templatesLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Pipeline"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
