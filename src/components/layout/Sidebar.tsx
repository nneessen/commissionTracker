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
  UserPlus,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  X,
  Shield,
  ClipboardList,
  GraduationCap,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";
import { useAuthorizationStatus } from "@/hooks/admin/useUserApproval";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { PermissionCode } from "@/types/permissions.types";
import type { RoleName } from "@/types/permissions.types";
import { NotificationDropdown } from "@/components/notifications";
import { toast } from "sonner";

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
  /** Permission required to see this nav item */
  permission?: PermissionCode;
  /** If true, show to everyone (no permission check) */
  public?: boolean;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const navigationItems: NavigationItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard", permission: "nav.dashboard" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics", permission: "nav.dashboard" },
  { icon: Target, label: "Targets", href: "/targets", permission: "nav.dashboard" },
  { icon: BarChart3, label: "Reports", href: "/reports", permission: "nav.downline_reports" },
  { icon: CreditCard, label: "Expenses", href: "/expenses", permission: "expenses.read.own" },
  { icon: FileText, label: "Policies", href: "/policies", permission: "nav.policies" },
  { icon: Users, label: "Team", href: "/hierarchy", permission: "nav.team_dashboard" },
  { icon: UserPlus, label: "Recruiting", href: "/recruiting", permission: "nav.recruiting_pipeline" },
  { icon: Settings, label: "Settings", href: "/settings", public: true },
];

// Training Hub navigation items (for trainers and contracting managers)
const trainingNavigationItems: NavigationItem[] = [
  { icon: GraduationCap, label: "Training Hub", href: "/training-hub", permission: "nav.training_hub" },
];

// Admin-only navigation items
const adminNavigationItems: NavigationItem[] = [
  { icon: Shield, label: "Admin", href: "/admin", permission: "nav.user_management" },
];

// Recruit-only navigation items
const recruitNavigationItems: NavigationItem[] = [
  { icon: ClipboardList, label: "My Progress", href: "/recruiting/my-pipeline", public: true },
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
  const { can, isLoading } = usePermissionCheck();
  const { isPending, isLoading: authStatusLoading } = useAuthorizationStatus();
  const { user } = useAuth();

  // Fetch user roles from profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('roles')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as { roles: RoleName[] };
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: RoleName) => {
    return userProfile?.roles?.includes(role) || false;
  };

  const isRecruit = hasRole('recruit' as RoleName);

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

  // Handler for locked nav item clicks (for pending users)
  const handleLockedNavClick = () => {
    toast.error("Your account is pending approval. Please wait for administrator approval to access this feature.");
  };

  // If user is a recruit, show ONLY recruit navigation
  // If user is pending, show ALL items but they will be rendered as locked
  const visibleNavItems = isRecruit
    ? recruitNavigationItems
    : isPending
      ? navigationItems // Show all items for pending users (will be rendered as locked)
      : navigationItems.filter((item) => {
          if (item.public) return true;
          if (!item.permission) return false; // DEFAULT TO FALSE FOR SECURITY
          if (isLoading) return false;
          return can(item.permission);
        });

  const visibleTrainingItems = isRecruit
    ? []
    : isPending
      ? trainingNavigationItems // Show all for pending (will be locked)
      : trainingNavigationItems.filter((item) => {
          if (!item.permission) return false;
          if (isLoading) return false;
          return can(item.permission);
        });

  const visibleAdminItems = isRecruit
    ? []
    : isPending
      ? adminNavigationItems // Show all for pending (will be locked)
      : adminNavigationItems.filter((item) => {
          if (!item.permission) return false;
          if (isLoading) return false;
          return can(item.permission);
        });

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="secondary"
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
          className={`fixed inset-0 bg-background/90 backdrop-blur-sm z-[99] transition-all duration-300 ${
            isMobileOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-[100]
          transition-all duration-200
          ${isCollapsed ? "w-[72px]" : "w-[220px]"}
          ${isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : ""}
          ${isMobile && !isCollapsed ? "w-[280px]" : ""}
        `}
      >
        {/* Header */}
        <div className="p-3 border-b border-border bg-card/80 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 border border-border shadow-sm">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate tracking-tight">
                  {userName}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {userEmail}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isRecruit && <NotificationDropdown isCollapsed={isCollapsed} />}
            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeMobile}
              >
                <X size={16} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
              >
                {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {/* Main Navigation Items */}
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            // Check if this item should be locked (pending user + not a public item)
            const isLocked = isPending && !item.public;

            if (isLocked) {
              // Render locked nav item for pending users
              return (
                <div
                  key={item.href}
                  className={`relative mb-1 ${isCollapsed ? "mx-auto" : ""}`}
                  onClick={handleLockedNavClick}
                >
                  <Button
                    variant="ghost"
                    className={`h-9 ${isCollapsed ? "w-9 p-0" : "w-full justify-start px-3"} opacity-50 cursor-not-allowed`}
                    title={isCollapsed ? `${item.label} (Locked)` : ""}
                  >
                    <Icon size={16} className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`} />
                    {!isCollapsed && (
                      <span className="text-sm blur-[0.5px] text-muted-foreground">{item.label}</span>
                    )}
                  </Button>
                  <Lock
                    size={12}
                    className={`absolute ${isCollapsed ? "bottom-0 right-0" : "right-2 top-1/2 -translate-y-1/2"} text-muted-foreground/70`}
                  />
                </div>
              );
            }

            // Render normal nav item
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
                    className={`mb-1 h-9 ${isCollapsed ? "w-9 p-0 mx-auto" : "w-full justify-start px-3"}`}
                    title={isCollapsed ? item.label : ""}
                    data-active={isActive}
                  >
                    <Icon size={16} className={isCollapsed ? "" : "mr-2.5"} />
                    {!isCollapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </Button>
                )}
              </Link>
            );
          })}

          {/* Separator for training/admin section */}
          {(visibleTrainingItems.length > 0 || visibleAdminItems.length > 0) && !isCollapsed && (
            <div className="my-2 border-t border-border" />
          )}

          {/* Training Hub Navigation Items */}
          {visibleTrainingItems.map((item) => {
            const Icon = item.icon;
            const isLocked = isPending && !item.public;

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className={`relative mb-1 ${isCollapsed ? "mx-auto" : ""}`}
                  onClick={handleLockedNavClick}
                >
                  <Button
                    variant="ghost"
                    className={`h-9 ${isCollapsed ? "w-9 p-0" : "w-full justify-start px-3"} opacity-50 cursor-not-allowed`}
                    title={isCollapsed ? `${item.label} (Locked)` : ""}
                  >
                    <Icon size={16} className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`} />
                    {!isCollapsed && (
                      <span className="text-sm blur-[0.5px] text-muted-foreground">{item.label}</span>
                    )}
                  </Button>
                  <Lock
                    size={12}
                    className={`absolute ${isCollapsed ? "bottom-0 right-0" : "right-2 top-1/2 -translate-y-1/2"} text-muted-foreground/70`}
                  />
                </div>
              );
            }

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
                    className={`mb-1 h-9 ${isCollapsed ? "w-9 p-0 mx-auto" : "w-full justify-start px-3"}`}
                    title={isCollapsed ? item.label : ""}
                    data-active={isActive}
                  >
                    <Icon size={16} className={isCollapsed ? "" : "mr-2.5"} />
                    {!isCollapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </Button>
                )}
              </Link>
            );
          })}

          {/* Admin Navigation Items */}
          {visibleAdminItems.map((item) => {
            const Icon = item.icon;
            const isLocked = isPending && !item.public;

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className={`relative mb-1 ${isCollapsed ? "mx-auto" : ""}`}
                  onClick={handleLockedNavClick}
                >
                  <Button
                    variant="ghost"
                    className={`h-9 ${isCollapsed ? "w-9 p-0" : "w-full justify-start px-3"} opacity-50 cursor-not-allowed`}
                    title={isCollapsed ? `${item.label} (Locked)` : ""}
                  >
                    <Icon size={16} className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`} />
                    {!isCollapsed && (
                      <span className="text-sm blur-[0.5px] text-muted-foreground">{item.label}</span>
                    )}
                  </Button>
                  <Lock
                    size={12}
                    className={`absolute ${isCollapsed ? "bottom-0 right-0" : "right-2 top-1/2 -translate-y-1/2"} text-muted-foreground/70`}
                  />
                </div>
              );
            }

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
                    className={`mb-1 h-9 ${isCollapsed ? "w-9 p-0 mx-auto" : "w-full justify-start px-3"}`}
                    title={isCollapsed ? item.label : ""}
                    data-active={isActive}
                  >
                    <Icon size={16} className={isCollapsed ? "" : "mr-2.5"} />
                    {!isCollapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </Button>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-card/80">
          <div className="flex items-center gap-2 mb-2">
            <ThemeToggle />
            {!isCollapsed && (
              <span className="text-xs text-muted-foreground">Theme</span>
            )}
          </div>
          <Button
            variant="destructive"
            className={`h-9 ${isCollapsed ? "w-9 p-0 mx-auto" : "w-full justify-start px-3"}`}
            onClick={onLogout}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut size={16} className={isCollapsed ? "" : "mr-2.5"} />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Main content margin helper - this pushes content when sidebar is visible */}
      <style>{`
        .main-content {
          margin-left: ${isCollapsed ? "72px" : "220px"};
          transition: margin-left 0.2s ease;
        }
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
}
