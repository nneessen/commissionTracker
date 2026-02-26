// src/features/chat-bot/components/LeadStatusSelector.tsx
// Checkbox list for selecting which lead statuses the bot should respond to

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const PREDEFINED_STATUSES = [
  "New",
  "Contacted",
  "Contacted/Texting",
  "Contacted/Call Back",
  "Contacted/Quoted",
  "CONTACTED/MISSED APPOINTMENT",
  "Contacted/No Answer",
  "Contacted/Left VM",
  "Contacted/Straight to VM",
  "Contacted/Doesn't Ring",
  "Contacted/Blocked",
  "Contacted/Not In Service",
  "Contacted/Hung Up",
];

interface LeadStatusSelectorProps {
  selected: string[];
  onChange: (statuses: string[]) => void;
  disabled?: boolean;
}

export function LeadStatusSelector({
  selected,
  onChange,
  disabled,
}: LeadStatusSelectorProps) {
  const allSelected = PREDEFINED_STATUSES.every((s) => selected.includes(s));

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([...PREDEFINED_STATUSES]);
    }
  };

  const toggle = (status: string) => {
    if (selected.includes(status)) {
      onChange(selected.filter((s) => s !== status));
    } else {
      onChange([...selected, status]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Select All toggle */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-blue-600 dark:text-blue-400"
          onClick={toggleAll}
          disabled={disabled}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
        <span className="text-[10px] text-zinc-400">
          {selected.length} / {PREDEFINED_STATUSES.length}
        </span>
      </div>

      {/* Status checkboxes */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {PREDEFINED_STATUSES.map((status) => (
          <label
            key={status}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(status)}
              onCheckedChange={() => toggle(status)}
              disabled={disabled}
            />
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
              {status}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
