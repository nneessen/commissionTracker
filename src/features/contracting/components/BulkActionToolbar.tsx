// src/features/contracting/components/BulkActionToolbar.tsx
// Floating toolbar for bulk actions on selected contract requests

import { Button } from '@/components/ui/button';
import { FileDown, Trash2, X, RefreshCw } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onStatusChange: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onStatusChange,
  onExport,
  onDelete,
  onClear,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg shadow-xl px-4 py-2 flex items-center gap-3 z-50 animate-in slide-in-from-bottom-2">
      <span className="text-xs font-medium">{selectedCount} selected</span>
      <div className="h-4 w-px bg-zinc-700 dark:bg-zinc-300" />
      <Button
        size="sm"
        variant="ghost"
        onClick={onStatusChange}
        className="h-7 px-2 text-xs text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Change Status
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onExport}
        className="h-7 px-2 text-xs text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
      >
        <FileDown className="h-3 w-3 mr-1" />
        Export
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="h-7 px-2 text-xs text-red-300 hover:text-red-100 hover:bg-red-500/20"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete
      </Button>
      <div className="h-4 w-px bg-zinc-700 dark:bg-zinc-300" />
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-7 px-2 text-xs text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
