// src/components/layout/SettingsLayout.tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SettingsLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  backLink?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * SettingsLayout - Dense layout wrapper for settings pages
 *
 * Features:
 * - Compact header (48px height)
 * - Tight spacing (12px gaps)
 * - Consistent with dense design system
 * - Breadcrumb navigation support
 */
export default function SettingsLayout({
  title,
  description,
  children,
  backLink = '/dashboard',
  actions,
  className
}: SettingsLayoutProps) {
  return (
    <div className={cn("layout-dense-content", className)}>
      {/* Dense header with back navigation */}
      <div className="layout-dense-header mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link to={backLink}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="text-sm">Back</span>
              </Button>
            </Link>
          </div>

          <h1 className="text-xl font-bold">{title}</h1>
          {description && (
            <p className="text-[13px] text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="layout-dense-header-actions">
            {actions}
          </div>
        )}
      </div>

      {/* Content area with dense card styling */}
      <Card className="p-4">
        {children}
      </Card>
    </div>
  );
}