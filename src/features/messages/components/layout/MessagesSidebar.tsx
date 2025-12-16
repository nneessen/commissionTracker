// src/features/messages/components/layout/MessagesSidebar.tsx
// Labels sidebar for message organization

import { useState } from "react";
import { useLabels } from "../../hooks/useLabels";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Send,
  FileEdit,
  Clock,
  Archive,
  Star,
  AlertCircle,
  Tag,
  Plus,
  ChevronDown,
  ChevronRight,
  PenSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagesSidebarProps {
  selectedLabelId: string | null;
  onLabelSelect: (labelId: string | null) => void;
  onComposeClick: () => void;
}

// System label icons mapping
const SYSTEM_LABEL_ICONS: Record<string, React.ElementType> = {
  Inbox: Inbox,
  Sent: Send,
  Drafts: FileEdit,
  Scheduled: Clock,
  Archived: Archive,
  Important: Star,
  Spam: AlertCircle,
};

export function MessagesSidebar({
  selectedLabelId,
  onLabelSelect,
  onComposeClick,
}: MessagesSidebarProps) {
  const { labels, isLoading: _isLoading } = useLabels();
  const [customLabelsExpanded, setCustomLabelsExpanded] = useState(true);

  // Separate system and custom labels
  const systemLabels = labels?.filter((l) => l.is_system) || [];
  const customLabels = labels?.filter((l) => !l.is_system) || [];

  return (
    <div className="w-56 flex-shrink-0 border-r border-slate-300 dark:border-slate-700 flex flex-col bg-slate-100 dark:bg-slate-900">
      {/* Compose button - prominent styling */}
      <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Button
          className="w-full h-10 text-sm font-medium justify-center gap-2 shadow-md"
          onClick={onComposeClick}
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {/* All Messages */}
          <LabelButton
            icon={Inbox}
            label="All Messages"
            count={0}
            isSelected={selectedLabelId === null}
            onClick={() => onLabelSelect(null)}
          />

          {/* System Labels */}
          <div className="pt-4 pb-2 px-1">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Folders
            </span>
          </div>
          {systemLabels.map((label) => {
            const Icon = SYSTEM_LABEL_ICONS[label.name] || Tag;
            return (
              <LabelButton
                key={label.id}
                icon={Icon}
                label={label.name}
                count={label.message_count || 0}
                color={label.color}
                isSelected={selectedLabelId === label.id}
                onClick={() => onLabelSelect(label.id)}
              />
            );
          })}

          {/* Custom Labels Section */}
          {customLabels.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-1">
                <button
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 w-full"
                  onClick={() => setCustomLabelsExpanded(!customLabelsExpanded)}
                >
                  {customLabelsExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Labels
                </button>
              </div>

              {customLabelsExpanded &&
                customLabels.map((label) => (
                  <LabelButton
                    key={label.id}
                    icon={Tag}
                    label={label.name}
                    count={label.message_count || 0}
                    color={label.color}
                    isSelected={selectedLabelId === label.id}
                    onClick={() => onLabelSelect(label.id)}
                  />
                ))}
            </>
          )}

          {/* Create Label */}
          <button className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 w-full px-3 py-2 mt-3 rounded-md transition-colors border border-dashed border-slate-300 dark:border-slate-600">
            <Plus className="h-3.5 w-3.5" />
            Create label
          </button>
        </div>
      </ScrollArea>

      {/* Usage stats at bottom */}
      <div className="p-3 border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
        <div className="text-[11px] space-y-1.5">
          <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
            <span>Daily quota</span>
            <span className="text-slate-900 dark:text-white">0 / 50</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: "0%" }}
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Resets at midnight
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-[11px] gap-1.5 border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 hover:border-amber-500"
          onClick={() => {
            // TODO: Open upgrade modal with tier options
            // Tiers: Basic (50/day), Pro (200/day), Business (500/day), Custom
            console.log("Upgrade clicked - premium tiers coming soon");
          }}
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade for more
        </Button>
      </div>
    </div>
  );
}

interface LabelButtonProps {
  icon: React.ElementType;
  label: string;
  count?: number;
  color?: string;
  isSelected: boolean;
  onClick: () => void;
}

function LabelButton({
  icon: Icon,
  label,
  count,
  color,
  isSelected,
  onClick,
}: LabelButtonProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] transition-all border",
        isSelected
          ? "bg-primary text-primary-foreground font-medium border-primary shadow-sm"
          : "bg-slate-50 dark:bg-slate-800 text-foreground border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
      )}
      onClick={onClick}
    >
      <Icon
        className="h-4 w-4 flex-shrink-0"
        style={color && !isSelected ? { color } : undefined}
      />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge
          variant={isSelected ? "outline" : "secondary"}
          className={cn(
            "h-5 min-w-[20px] px-1.5 text-[10px] font-medium",
            isSelected
              ? "border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10"
              : "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200",
          )}
        >
          {count}
        </Badge>
      )}
    </button>
  );
}
