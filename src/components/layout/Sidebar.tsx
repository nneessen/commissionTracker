// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home,
  TrendingUp,
  Target,
  BarChart3,
  CreditCard,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const navigationItems: NavigationItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics" },
  { icon: Target, label: "Targets", href: "/targets" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: CreditCard, label: "Expenses", href: "/expenses" },
  { icon: FileText, label: "Policies", href: "/policies" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  userName = "Nick Neessen",
  userEmail = "nick@nickneessen.com",
  onLogout,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="default"
          size="icon"
          className="fixed top-3 left-3 z-[101] h-9 w-9"
          onClick={toggleMobile}
        >
          <Menu size={18} />
        </Button>
      )}

      {/* Mobile Overlay */}
      {isMobile && (
        <div
          className={`mobile-overlay ${isMobileOpen ? "active" : ""}`}
          onClick={closeMobile}
        />
      )}

      <div
        className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""} ${isMobile && isMobileOpen ? "mobile-open" : ""}`}
      >
        {/* Header */}
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{userName}</div>
                <div className="sidebar-user-email">{userEmail}</div>
              </div>
            </div>
          )}
          {isMobile ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeMobile}>
              <X size={16} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}>
              {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => {
                  if (isMobile) closeMobile();
                }}
              >
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`sidebar-nav-item h-9 ${isCollapsed ? "w-9 p-0" : "w-full justify-start px-3"}`}
                    title={isCollapsed ? item.label : ""}
                    data-active={isActive}
                  >
                    <Icon size={16} className={isCollapsed ? "" : "mr-2"} />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </Button>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="flex items-center gap-2 mb-2">
            <ThemeToggle />
            {!isCollapsed && <span className="text-xs text-muted-foreground">Theme</span>}
          </div>
          <Button
            variant="destructive"
            className={`h-9 ${isCollapsed ? "w-9 p-0" : "w-full justify-start px-3"}`}
            onClick={onLogout}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut size={16} className={isCollapsed ? "" : "mr-2"} />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </Button>
        </div>
      </div>
    </>
  );
}
