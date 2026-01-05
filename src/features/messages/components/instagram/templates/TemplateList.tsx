// src/features/messages/components/instagram/templates/TemplateList.tsx
// Table component for displaying Instagram message templates

import { useState, type ReactNode } from "react";
import { Edit2, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MESSAGE_STAGE_LABELS,
  getCategoryLabel,
  type MessageStage,
  type InstagramMessageTemplate,
} from "@/types/instagram.types";
import { useInstagramTemplateCategories } from "@/hooks/instagram/useInstagramIntegration";
import { TemplateDeleteDialog } from "./TemplateDeleteDialog";

interface TemplateListProps {
  templates: InstagramMessageTemplate[];
  isLoading: boolean;
  onEdit: (template: InstagramMessageTemplate) => void;
}

export function TemplateList({
  templates,
  isLoading,
  onEdit,
}: TemplateListProps): ReactNode {
  const [deleteTemplate, setDeleteTemplate] =
    useState<InstagramMessageTemplate | null>(null);
  const { data: customCategories = [] } = useInstagramTemplateCategories();

  // Truncate content for display
  const truncate = (str: string, maxLen = 50) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + "...";
  };

  // Get stage badge color
  const getStageBadgeVariant = (stage: string | null) => {
    switch (stage) {
      case "opener":
        return "default";
      case "follow_up":
        return "secondary";
      case "closer":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          No templates found
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Create a template to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 h-8">
              Name
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 h-8">
              Content
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 h-8 w-24">
              Type
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 h-8 w-20">
              Stage
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 h-8 w-16 text-right">
              Uses
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 h-8 w-20">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow
              key={template.id}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <TableCell className="py-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                {template.name}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
                {truncate(template.content)}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                {template.category
                  ? getCategoryLabel(template.category, customCategories)
                  : "-"}
              </TableCell>
              <TableCell className="py-2">
                {template.message_stage ? (
                  <Badge
                    variant={getStageBadgeVariant(template.message_stage)}
                    className="text-[10px] h-5"
                  >
                    {MESSAGE_STAGE_LABELS[
                      template.message_stage as MessageStage
                    ] || template.message_stage}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-zinc-400">-</span>
                )}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-zinc-500 dark:text-zinc-400 text-right tabular-nums">
                {template.use_count || 0}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onEdit(template)}
                    title="Edit template"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => setDeleteTemplate(template)}
                    title="Delete template"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <TemplateDeleteDialog
        template={deleteTemplate}
        onClose={() => setDeleteTemplate(null)}
      />
    </>
  );
}
