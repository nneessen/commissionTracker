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
  Mail,
  Crown,
  FileCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";
import { useAuthorizationStatus } from "@/hooks/admin/useUserApproval";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSubscription,
  FEATURE_PLAN_REQUIREMENTS,
  type FeatureKey,
  useOwnerDownlineAccess,
  isOwnerDownlineGrantedFeature,
} from "@/hooks/subscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { PermissionCode } from "@/types/permissions.types";
import type { RoleName } from "@/types/permissions.types";
import { NotificationDropdown } from "@/components/notifications";
import { toast } from "sonner";
import { useImo } from "@/contexts/ImoContext";

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
  permission?: PermissionCode;
  public?: boolean;
  subscriptionFeature?: FeatureKey;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const navigationItems: NavigationItem[] = [
  {
    icon: Home,
    label: "Dashboard",
    href: "/dashboard",
    permission: "nav.dashboard",
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    href: "/analytics",
    permission: "nav.dashboard",
  },
  {
    icon: Target,
    label: "Targets",
    href: "/targets",
    permission: "nav.dashboard",
    subscriptionFeature: "targets_basic",
  },
  {
    icon: BarChart3,
    label: "Reports",
    href: "/reports",
    permission: "nav.downline_reports",
    subscriptionFeature: "reports_view",
  },
  {
    icon: CreditCard,
    label: "Expenses",
    href: "/expenses",
    permission: "expenses.read.own",
    subscriptionFeature: "expenses",
  },
  {
    icon: FileText,
    label: "Policies",
    href: "/policies",
    permission: "nav.policies",
  },
  {
    icon: Users,
    label: "Team",
    href: "/hierarchy",
    permission: "nav.team_dashboard",
    subscriptionFeature: "hierarchy",
  },
  {
    icon: UserPlus,
    label: "Recruiting",
    href: "/recruiting",
    permission: "nav.recruiting_pipeline",
    subscriptionFeature: "recruiting",
  },
  {
    icon: Mail,
    label: "Messages",
    href: "/messages",
    permission: "nav.messages",
    subscriptionFeature: "email",
  },
  { icon: Settings, label: "Settings", href: "/settings", public: true },
];

// Staff-only navigation items (for trainers and contracting managers)
// These roles have a separate dashboard and limited access
const staffNavigationItems: NavigationItem[] = [
  {
    icon: GraduationCap,
    label: "Training Hub",
    href: "/training-hub",
    public: true, // Training Hub is the main entry point for staff
  },
  {
    icon: UserPlus,
    label: "Recruiting",
    href: "/recruiting",
    public: true, // Staff can access all IMO recruits via RLS
  },
  {
    icon: FileCheck,
    label: "Contracting",
    href: "/contracting",
    public: true, // Staff manage carrier contracts
  },
  {
    icon: Mail,
    label: "Messages",
    href: "/messages",
    public: true, // Staff need unrestricted access to messaging
  },
  { icon: Settings, label: "Settings", href: "/settings", public: true },
];

// Admin-only navigation items
const adminNavigationItems: NavigationItem[] = [
  {
    icon: Shield,
    label: "Admin",
    href: "/admin",
    permission: "nav.user_management",
  },
];

// Recruit-only navigation items
const recruitNavigationItems: NavigationItem[] = [
  {
    icon: ClipboardList,
    label: "My Progress",
    href: "/recruiting/my-pipeline",
    public: true,
  },
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
  const { isPending, isLoading: _authStatusLoading } = useAuthorizationStatus();
  const { user, supabaseUser } = useAuth();
  const { subscription, isLoading: subLoading } = useSubscription();
  const { isDirectDownlineOfOwner, isLoading: downlineLoading } =
    useOwnerDownlineAccess();

  // IMO/Agency context for branding display
  // LOW-4 fix: Also get loading/error states for graceful handling
  const { imo, agency, loading: imoLoading, error: imoError } = useImo();

  // Admin email bypass - matches ADMIN_EMAILS in RouteGuard
  const ADMIN_EMAILS = [
    "nick@nickneessen.com",
    "nickneessen@thestandardhq.com",
  ];
  const isAdmin =
    supabaseUser?.email && ADMIN_EMAILS.includes(supabaseUser.email);

  // Check if a subscription feature is available
  const hasFeature = (feature: FeatureKey | undefined): boolean => {
    if (!feature) return true; // No feature required
    if (isAdmin) return true; // Admin bypass
    if (subLoading || downlineLoading) return true; // Assume access while loading to avoid flickering

    // Check subscription plan features
    const features = subscription?.plan?.features;
    if (features?.[feature]) return true;

    // Check if user is direct downline of owner and feature is granted
    if (isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(feature)) {
      return true;
    }

    return false;
  };

  // Fetch user roles from profile
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("roles")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as { roles: RoleName[] };
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: RoleName) => {
    return userProfile?.roles?.includes(role) || false;
  };

  const isRecruit = hasRole("recruit" as RoleName);
  // Staff-only check is based purely on ROLES, not admin email bypass
  // A user with trainer/contracting_manager roles but NO agent/admin role
  // should see staff navigation regardless of email
  const isTrainerOnly =
    (hasRole("trainer" as RoleName) ||
      hasRole("contracting_manager" as RoleName)) &&
    !hasRole("agent" as RoleName) &&
    !hasRole("admin" as RoleName);

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
    toast.error(
      "Your account is pending approval. Please wait for administrator approval to access this feature.",
    );
  };

  // Handler for subscription-locked nav item clicks
  const handleSubscriptionLockedClick = (feature: FeatureKey) => {
    const requiredPlan = FEATURE_PLAN_REQUIREMENTS[feature];
    toast.error(
      `This feature requires the ${requiredPlan} plan. Go to Settings > Billing to upgrade.`,
      {
        action: {
          label: "Upgrade",
          onClick: () => {
            window.location.href = "/settings?tab=billing";
          },
        },
      },
    );
  };

  // Navigation logic:
  // - Recruits: Show ONLY recruit navigation
  // - Staff (trainer/contracting_manager only): Show staff navigation (trainer dashboard, training hub, messages, settings)
  // - Pending users: Show all items but rendered as locked
  // - Regular users: Show navigation based on permissions
  const visibleNavItems = isRecruit
    ? recruitNavigationItems
    : isTrainerOnly
      ? staffNavigationItems.filter((item) => {
          if (item.public) return true;
          if (!item.permission) return false;
          if (isLoading) return false;
          return can(item.permission);
        })
      : isPending
        ? navigationItems // Show all items for pending users (will be rendered as locked)
        : navigationItems.filter((item) => {
            if (item.public) return true;
            if (!item.permission) return false; // DEFAULT TO FALSE FOR SECURITY
            if (isLoading) return false;
            return can(item.permission);
          });

  // Staff-only roles don't see the training items section (it's already in their main nav)
  // Regular agents with training permissions will still see it
  const visibleTrainingItems: NavigationItem[] =
    isRecruit || isTrainerOnly
      ? []
      : isPending
        ? [] // Don't show training items for pending regular users
        : [];

  const visibleAdminItems =
    isRecruit || isTrainerOnly
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
                {/* LOW-4 fix: Handle loading/error states for IMO display */}
                {imoLoading ? (
                  <div className="text-[10px] text-muted-foreground/50 truncate mt-0.5">
                    Loading...
                  </div>
                ) : imoError ? (
                  <div className="text-[10px] text-red-400/70 truncate mt-0.5">
                    Organization unavailable
                  </div>
                ) : imo || agency ? (
                  <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1">
                    {imo && (
                      <span
                        className="font-medium"
                        style={{
                          color: imo.primary_color || undefined,
                        }}
                      >
                        {imo.code}
                      </span>
                    )}
                    {imo && agency && <span className="opacity-50">•</span>}
                    {agency && <span>{agency.code}</span>}
                  </div>
                ) : null}
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
            const isPendingLocked = isPending && !item.public;
            // Check if this item requires a subscription feature the user doesn't have
            const isSubscriptionLocked =
              item.subscriptionFeature && !hasFeature(item.subscriptionFeature);
            const requiredPlan = item.subscriptionFeature
              ? FEATURE_PLAN_REQUIREMENTS[item.subscriptionFeature]
              : null;

            if (isPendingLocked) {
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
                    <Icon
                      size={16}
                      className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`}
                    />
                    {!isCollapsed && (
                      <span className="text-sm blur-[0.5px] text-muted-foreground">
                        {item.label}
                      </span>
                    )}
                  </Button>
                  <Lock
                    size={12}
                    className={`absolute ${isCollapsed ? "bottom-0 right-0" : "right-2 top-1/2 -translate-y-1/2"} text-muted-foreground/70`}
                  />
                </div>
              );
            }

            if (isSubscriptionLocked && item.subscriptionFeature) {
              // Render subscription-locked nav item with crown icon
              return (
                <div
                  key={item.href}
                  className={`relative mb-1 ${isCollapsed ? "mx-auto" : ""}`}
                  onClick={() =>
                    handleSubscriptionLockedClick(item.subscriptionFeature!)
                  }
                >
                  <Button
                    variant="ghost"
                    className={`h-9 ${isCollapsed ? "w-9 p-0" : "w-full justify-start px-3"} opacity-60 cursor-pointer hover:opacity-80`}
                    title={
                      isCollapsed
                        ? `${item.label} (${requiredPlan} required)`
                        : `Requires ${requiredPlan} plan`
                    }
                  >
                    <Icon
                      size={16}
                      className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`}
                    />
                    {!isCollapsed && (
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                    )}
                  </Button>
                  <Crown
                    size={12}
                    className={`absolute ${isCollapsed ? "bottom-0 right-0" : "right-2 top-1/2 -translate-y-1/2"} text-amber-500`}
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
                    variant={isActive ? "outline" : "muted"}
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
          {(visibleTrainingItems.length > 0 || visibleAdminItems.length > 0) &&
            !isCollapsed && <div className="my-4 border-t border-border" />}

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
                    <Icon
                      size={16}
                      className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`}
                    />
                    {!isCollapsed && (
                      <span className="text-sm blur-[0.5px] text-muted-foreground">
                        {item.label}
                      </span>
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
                    <Icon
                      size={16}
                      className={`${isCollapsed ? "" : "mr-2.5"} text-muted-foreground`}
                    />
                    {!isCollapsed && (
                      <span className="text-sm blur-[0.5px] text-muted-foreground">
                        {item.label}
                      </span>
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
