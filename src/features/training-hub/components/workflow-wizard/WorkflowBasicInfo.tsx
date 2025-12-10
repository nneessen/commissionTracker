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
    <div className="w-full space-y-6">
      {/* Workflow Name */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Workflow Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Welcome Email Series"
          className={cn(
            "text-sm",
            errors.name && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={100}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name}</p>
        )}

        {/* Quick name suggestions */}
        {!data.name && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {NAME_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onChange({ name: suggestion })}
                  className="text-sm"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted-foreground">
            {data.name.length}/100
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Description
          <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
        </Label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Briefly describe what this workflow does and when it should run..."
          className="text-sm resize-none"
          rows={3}
          maxLength={500}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted-foreground">
            {(data.description?.length || 0)}/500
          </span>
        </div>
      </div>

      {/* Category */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.category}
          onValueChange={(value) => onChange({ category: value as WorkflowCategory })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                <div>
                  <div className="font-medium">{category.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {category.description}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Tips for a good workflow:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Use clear, descriptive names that explain the purpose</li>
              <li>Choose the right category to help with organization</li>
              <li>Add a description to help others understand the workflow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}