// src/features/recruiting/admin/PipelineTemplateEditor.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTemplate, useUpdateTemplate } from "../hooks/usePipeline";
import { PhaseEditor } from "./PhaseEditor";

interface PipelineTemplateEditorProps {
  templateId: string;
  onClose: () => void;
}

export function PipelineTemplateEditor({
  templateId,
  onClose,
}: PipelineTemplateEditorProps) {
  const { data: template, isLoading } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when template loads
  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setIsActive(template.is_active);
      setHasChanges(false);
    }
  }, [template]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic field value
  const handleFieldChange = (field: string, value: any) => {
    switch (field) {
      case "name":
        setName(value);
        break;
      case "description":
        setDescription(value);
        break;
      case "is_active":
        setIsActive(value);
        break;
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      await updateTemplate.mutateAsync({
        id: templateId,
        updates: {
          name,
          description: description || undefined,
          is_active: isActive,
        },
      });
      toast.success("Template saved");
      setHasChanges(false);
    } catch (_error) {
      toast.error("Failed to save template");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!template) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Template not found
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{template.name}</span>
          {template.is_default && (
            <Badge variant="secondary" className="text-xs">
              Default
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateTemplate.isPending}
        >
          {updateTemplate.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Template Details */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Template Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <div className="flex items-center gap-2 h-8">
              <Checkbox
                checked={isActive}
                onCheckedChange={(checked: boolean) =>
                  handleFieldChange("is_active", checked)
                }
              />
              <span className="text-sm">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              placeholder="Optional description..."
              className="text-sm min-h-16"
            />
          </div>
        </div>
      </Card>

      {/* Phases Editor */}
      <Card className="p-4">
        <PhaseEditor templateId={templateId} />
      </Card>
    </div>
  );
}
