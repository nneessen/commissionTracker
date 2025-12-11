// src/features/training-hub/components/workflow-wizard/WorkflowBasicInfo.tsx

import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkflowFormData, WorkflowCategory } from '@/types/workflow.types';

interface WorkflowBasicInfoProps {
  data: WorkflowFormData;
  onChange: (updates: Partial<WorkflowFormData>) => void;
  errors: Record<string, string>;
}

const WORKFLOW_CATEGORIES = [
  {
    value: 'email' as WorkflowCategory,
    label: 'Email',
    description: 'Email campaigns and communications'
  },
  {
    value: 'recruiting' as WorkflowCategory,
    label: 'Recruiting',
    description: 'Candidate and recruit management'
  },
  {
    value: 'commission' as WorkflowCategory,
    label: 'Commission',
    description: 'Commission tracking and alerts'
  },
  {
    value: 'general' as WorkflowCategory,
    label: 'General',
    description: 'Other automation workflows'
  }
];

const NAME_SUGGESTIONS = [
  'Welcome Email Series',
  'New Recruit Onboarding',
  'Commission Alert System',
  'Weekly Progress Report'
];

export default function WorkflowBasicInfo({ data, onChange, errors }: WorkflowBasicInfoProps) {
  return (
    <div className="w-full space-y-3">
      {/* Workflow Name */}
      <div className="p-2 rounded-md bg-muted/50">
        <Label className="text-xs font-medium text-muted-foreground">
          Workflow Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Welcome Email Series"
          className={cn(
            "h-8 text-xs mt-1 bg-background",
            errors.name && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={100}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="p-2 rounded-md bg-muted/30">
        <Label className="text-xs font-medium text-muted-foreground">
          Description <span className="text-xs text-muted-foreground/70">(optional)</span>
        </Label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Briefly describe what this workflow does..."
          className="h-16 text-xs resize-none mt-1 bg-background"
          rows={3}
          maxLength={500}
        />
      </div>

      {/* Category */}
      <div className="p-2 rounded-md bg-muted/50">
        <Label className="text-xs font-medium text-muted-foreground">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.category}
          onValueChange={(value) => onChange({ category: value as WorkflowCategory })}
        >
          <SelectTrigger className="h-8 text-xs mt-1 bg-background">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_CATEGORIES.map((category) => (
              <SelectItem
                key={category.value}
                value={category.value}
                className="text-xs"
              >
                <div>
                  <div className="font-medium">{category.label}</div>
                  <div className="text-[10px] text-muted-foreground">{category.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}