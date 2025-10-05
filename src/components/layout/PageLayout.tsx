import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified page layout component for all dashboard pages.
 * Provides consistent padding and max-width across the application.
 *
 * Usage:
 * <PageLayout>
 *   <div className="dashboard-header">...</div>
 *   <div className="dashboard-content">...</div>
 * </PageLayout>
 */
export default function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`}>
      {children}
    </div>
  );
}
