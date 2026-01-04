// src/features/messages/components/instagram/InstagramTemplateSelector.tsx
// Dropdown component for quickly inserting message templates

import { useState, useMemo, type ReactNode } from "react";
import { FileText, Search, Loader2, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useInstagramTemplates } from "@/hooks/instagram/useInstagramIntegration";
import type { InstagramMessageTemplate } from "@/types/instagram.types";

interface InstagramTemplateSelectorProps {
  onSelect: (content: string, templateId: string) => void;
  disabled?: boolean;
  className?: string;
}

// Template categories with display labels
const CATEGORY_LABELS: Record<string, string> = {
  greeting: "Greetings",
  follow_up: "Follow Up",
  scheduling: "Scheduling",
  closing: "Closing",
  general: "General",
};

// Sort order for categories
const CATEGORY_ORDER = [
  "greeting",
  "follow_up",
  "scheduling",
  "closing",
  "general",
];

export function InstagramTemplateSelector({
  onSelect,
  disabled = false,
  className,
}: InstagramTemplateSelectorProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: templates = [], isLoading } = useInstagramTemplates();

  // Filter and group templates
  const { groupedTemplates, recentTemplates } = useMemo(() => {
    // Filter by search
    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase()),
    );

    // Group by category
    const grouped = new Map<string, InstagramMessageTemplate[]>();

    for (const template of filtered) {
      const category = template.category || "general";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(template);
    }

    // Sort each group by use count (most used first)
    for (const [, group] of grouped) {
      group.sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
    }

    // Get recently used (top 3 by last_used_at)
    const recent = [...templates]
      .filter((t) => t.last_used_at)
      .sort(
        (a, b) =>
          new Date(b.last_used_at!).getTime() -
          new Date(a.last_used_at!).getTime(),
      )
      .slice(0, 3);

    return { groupedTemplates: grouped, recentTemplates: recent };
  }, [templates, search]);

  const handleSelect = (template: InstagramMessageTemplate) => {
    onSelect(template.content, template.id);
    setOpen(false);
    setSearch("");
  };

  // Truncate content for preview
  const truncate = (str: string, maxLen = 60) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + "...";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", className)}
          disabled={disabled || isLoading}
          title="Insert template"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        {/* Search input */}
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-7 pl-7 text-[11px]"
            />
          </div>
        </div>

        <ScrollArea className="max-h-64">
          {templates.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                No templates yet
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Create templates to save time
              </p>
            </div>
          ) : groupedTemplates.size === 0 ? (
            <div className="p-4 text-center">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                No templates match "{search}"
              </p>
            </div>
          ) : (
            <div className="py-1">
              {/* Recently Used */}
              {recentTemplates.length > 0 && !search && (
                <div className="mb-2">
                  <div className="px-2 py-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Recently Used
                    </span>
                  </div>
                  {recentTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      truncate={truncate}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {/* Grouped by Category */}
              {CATEGORY_ORDER.filter((cat) => groupedTemplates.has(cat)).map(
                (category) => (
                  <div key={category} className="mb-2">
                    <div className="px-2 py-1">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                    </div>
                    {groupedTemplates.get(category)!.map((template) => (
                      <TemplateItem
                        key={template.id}
                        template={template}
                        truncate={truncate}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ),
              )}

              {/* Uncategorized / Other */}
              {Array.from(groupedTemplates.entries())
                .filter(([cat]) => !CATEGORY_ORDER.includes(cat))
                .map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <div className="px-2 py-1">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                    </div>
                    {items.map((template) => (
                      <TemplateItem
                        key={template.id}
                        template={template}
                        truncate={truncate}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface TemplateItemProps {
  template: InstagramMessageTemplate;
  truncate: (str: string, maxLen?: number) => string;
  onSelect: (template: InstagramMessageTemplate) => void;
}

function TemplateItem({
  template,
  truncate,
  onSelect,
}: TemplateItemProps): ReactNode {
  return (
    <button
      onClick={() => onSelect(template)}
      className={cn(
        "w-full px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
        "focus:outline-none focus:bg-zinc-100 dark:focus:bg-zinc-800",
      )}
    >
      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
        {template.name}
      </p>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
        {truncate(template.content)}
      </p>
    </button>
  );
}
