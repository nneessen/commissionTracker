// src/features/messages/components/layout/MessagesHeader.tsx
// Header with search and filters

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";

interface MessagesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MessagesHeader({
  searchQuery,
  onSearchChange,
}: MessagesHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-7 pl-8 text-[11px]"
        />
      </div>

      {/* Filters */}
      <Button variant="ghost" size="sm" className="h-7 px-2">
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </Button>

      {/* Refresh */}
      <Button variant="ghost" size="sm" className="h-7 px-2">
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
