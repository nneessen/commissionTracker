// src/features/settings/components/SettingsComponents.tsx
import React from "react";

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  children,
  icon,
  className = "",
}) => {
  return (
    <div className={`metric-card p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {icon && (
          <div className="p-1.5 rounded bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      <div className="text-xs">{children}</div>
    </div>
  );
};

interface SettingsHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div>{children}</div>}
      </div>
    </div>
  );
};

interface SettingsGridProps {
  children: React.ReactNode;
  columns?: number;
}

export const SettingsGrid: React.FC<SettingsGridProps> = ({
  children,
  columns = 2,
}) => {
  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
    }[columns] || "grid-cols-2";

  return <div className={`grid gap-3 mb-3 ${gridColsClass}`}>{children}</div>;
};
