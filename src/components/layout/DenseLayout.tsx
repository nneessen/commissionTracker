// src/components/layout/DenseLayout.tsx
import React, { useState, useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SidebarDense } from "./SidebarDense";

interface DenseLayoutProps {
  children?: React.ReactNode;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  className?: string;
}

/**
 * DenseLayout - Main layout wrapper for high-density interface
 *
 * Features:
 * - Responsive sidebar with collapse functionality
 * - Unified dense spacing system
 * - Mobile-optimized overlay sidebar
 * - Smooth transitions without layout shift
 */
export const DenseLayout: React.FC<DenseLayoutProps> = ({
  children,
  userName = "User",
  userEmail = "",
  onLogout,
  className,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save sidebar preference
  const handleToggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const handleToggleMobile = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <>
      {/* Import dense layout styles */}
      <style>{`@import url('/src/styles/layout-dense.css');`}</style>

      <div className={cn("layout-dense", className)}>
        {/* Sidebar */}
        <SidebarDense
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          userName={userName}
          userEmail={userEmail}
          onLogout={onLogout}
        />

        {/* Mobile overlay */}
        {isMobile && (
          <div
            className={cn(
              "layout-dense-sidebar-overlay",
              isMobileSidebarOpen && "layout-dense-sidebar-overlay-visible"
            )}
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Main content area with sidebar offset */}
        <div
          className={cn(
            "layout-dense-content",
            !isMobile && "layout-dense-with-sidebar",
            !isMobile && isSidebarCollapsed && "layout-dense-with-sidebar-collapsed"
          )}
        >
          {children || <Outlet />}
        </div>
      </div>
    </>
  );
};

/**
 * PageHeader - Consistent header for pages within dense layout
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}> = ({ title, subtitle, actions, breadcrumbs, className }) => {
  return (
    <div className={cn("layout-dense-header", className)}>
      <div className="flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="mx-1">/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="layout-dense-header-title">{title}</h1>
        {subtitle && (
          <p className="layout-dense-header-subtitle">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="layout-dense-header-actions">{actions}</div>
      )}
    </div>
  );
};

/**
 * PageSection - Consistent section wrapper for dense layout
 */
export const PageSection: React.FC<{
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, actions, children, className }) => {
  return (
    <div className={cn("layout-dense-section", className)}>
      {(title || actions) && (
        <div className="layout-dense-section-header">
          {title && <h2 className="layout-dense-section-title">{title}</h2>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default DenseLayout;