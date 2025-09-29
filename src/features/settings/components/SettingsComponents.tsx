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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h4>{title}</h4>
        {icon && (
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            border: '1px solid #e2e8f0',
            color: '#1a1a1a'
          }}>
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
    <div className="dashboard-header" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
  return (
    <div
      className="dashboard-metrics-grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '24px',
        marginBottom: '24px'
      }}
    >
      {children}
    </div>
  );
};