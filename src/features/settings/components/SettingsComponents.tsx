import React from 'react';

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
  className = '',
}) => {
  return (
    <div className={`metric-card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4>{title}</h4>
        {icon && (
          <div className="p-2 rounded-lg bg-gradient-to-br from-card to-muted border border-border text-foreground">
            {icon}
          </div>
        )}
      </div>
      <div>{children}</div>
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
    <div className="dashboard-header mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
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
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] || 'grid-cols-2';

  return (
    <div className={`dashboard-metrics-grid gap-6 mb-6 ${gridColsClass}`}>
      {children}
    </div>
  );
};