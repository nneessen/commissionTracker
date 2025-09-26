// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home,
  Calculator,
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
  { icon: Calculator, label: "Calculator", href: "/calculator" },
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
        <button className="mobile-menu-btn" onClick={toggleMobile}>
          <Menu size={20} />
        </button>
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
            <button className="sidebar-toggle" onClick={closeMobile}>
              <X size={16} />
            </button>
          ) : (
            <button className="sidebar-toggle" onClick={onToggleCollapse}>
              {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
            </button>
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
                className="sidebar-nav-item"
                activeOptions={{ exact: false }}
                activeProps={{
                  className: "sidebar-nav-item active",
                }}
                title={isCollapsed ? item.label : ""}
                onClick={() => {
                  if (isMobile) closeMobile();
                }}
              >
                <Icon size={16} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="sidebar-nav-item logout"
            onClick={onLogout}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
}

