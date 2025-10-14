// src/components/ui/empty-state.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "📊",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 px-4 text-center",
        className
      )}
    >
      <div className="text-5xl">{icon}</div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground mb-3">{description}</div>
      )}
      {action}
    </div>
  );
}
