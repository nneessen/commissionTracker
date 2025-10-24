// src/components/custom_ui/stat-card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "highlight";
  className?: string;
}

export function StatCard({
  label,
  value,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        variant === "highlight" && "p-3 bg-muted/50 rounded-lg",
        className
      )}
    >
      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "font-mono font-semibold",
          variant === "highlight" ? "text-xl" : "text-sm"
        )}
      >
        {value}
      </div>
    </div>
  );
}
