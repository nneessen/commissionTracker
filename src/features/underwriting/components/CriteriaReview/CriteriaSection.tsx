// src/features/underwriting/components/CriteriaReview/CriteriaSection.tsx

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CriteriaSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function CriteriaSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
  isEmpty = false,
  emptyMessage = "No data available",
}: CriteriaSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors group">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-400" />
          )}
          {icon && (
            <span className="text-zinc-500 dark:text-zinc-400">{icon}</span>
          )}
          <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
            {title}
          </span>
        </div>
        {badge && <div>{badge}</div>}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 py-2">
        {isEmpty ? (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
