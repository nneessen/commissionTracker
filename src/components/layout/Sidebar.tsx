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
  FileCheck,
  Workflow,
  ShieldCheck,
  Calculator,
  Trophy,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { usePermissionCheck, useUserRoles } from "@/hooks/permissions";
import { useAuthorizationStatus } from "@/hooks/admin";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSubscription,
  type FeatureKey,
  useOwnerDownlineAccess,
  isOwnerDownlineGrantedFeature,
} from "@/hooks/subscription";
import type { PermissionCode } from "@/types/permissions.types";
import type { RoleName } from "@/types/permissions.types";
import { NotificationDropdown } from "@/components/notifications";
import { toast } from "sonner";
import { useImo } from "@/contexts/ImoContext";
import { useTemporaryAccessCheck } from "@/hooks/subscription";
import {
  UnderwritingWizard,
  QuickQuoteDialog,
  useUnderwritingFeatureFlag,
} from "@/features/underwriting";

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
  permission?: PermissionCode;
  public?: boolean;
  subscriptionFeature?: FeatureKey;
  subscriptionFeatures?: FeatureKey[]; // Alternative: any of these features grants access
  superAdminOnly?: boolean; // Hide from all except super-admin
  allowedEmails?: string[]; // Whitelist of emails that can see this item
  allowedAgencyId?: string; // Restrict to users in a specific agency
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
    subscriptionFeature: "dashboard",
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    href: "/analytics",
    permission: "nav.dashboard",
    subscriptionFeature: "analytics",
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
    icon: Users,
    label: "Licenses/Writing #'s",
    href: "/the-standard-team",
    public: true,
    allowedAgencyId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  },
  {
    icon: Trophy,
    label: "Leaderboard",
    href: "/leaderboard",
    subscriptionFeature: "hierarchy",
    allowedEmails: [
      "nickneessen@thestandardhq.com",
      "nick@nickneessen.com",
      "kerryglass.ffl@gmail.com",
      "teagkeys@gmail.com",
    ],
  },
  {
    icon: UserPlus,
    label: "Recruiting",
    href: "/recruiting",
    permission: "nav.recruiting_pipeline",
    subscriptionFeatures: ["recruiting", "recruiting_basic"], // Either full or basic grants access
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
    icon: Home,
    label: "Dashboard",
    href: "/trainer-dashboard",
    public: true, // Staff dashboard - landing page for trainers
  },
  {
    icon: Trophy,
    label: "Leaderboard",
    href: "/leaderboard",
    allowedEmails: [
      "nickneessen@thestandardhq.com",
      "nick@nickneessen.com",
      "kerryglass.ffl@gmail.com",
      "teagkeys@gmail.com",
    ],
  },
  {
    icon: GraduationCap,
    label: "Training Hub",
    href: "/training-hub",
    public: true, // Training Hub for templates and automation
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

// Super-admin-only navigation items (nickneessen@thestandardhq.com only)
const superAdminNavigationItems: NavigationItem[] = [
  {
    icon: Workflow,
    label: "Workflows",
    href: "/system/workflows",
    public: true,
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
  userEmail = "nickneessen@thestandardhq.com",
  onLogout,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { can, isLoading } = usePermissionCheck();
  const { isPending, isLoading: _authStatusLoading } = useAuthorizationStatus();
  const { supabaseUser } = useAuth();
  const {
    subscription,
    isLoading: subLoading,
    isActive: isSubscriptionActive,
  } = useSubscription();
  const { isDirectDownlineOfOwner, isLoading: downlineLoading } =
    useOwnerDownlineAccess();
  const { data: userRoles } = useUserRoles();

  // IMO/Agency context for branding display
  // LOW-4 fix: Also get loading/error states for graceful handling
  const { imo, agency, loading: imoLoading, error: imoError } = useImo();

  // Underwriting wizard state
  const [isUnderwritingWizardOpen, setIsUnderwritingWizardOpen] =
    useState(false);
  const [isQuickQuoteOpen, setIsQuickQuoteOpen] = useState(false);
  const { isEnabled: isUnderwritingEnabled, isLoading: isUnderwritingLoading } =
    useUnderwritingFeatureFlag();

  // Temporary access check (database-driven)
  const { shouldGrantTemporaryAccess, isLoading: tempAccessLoading } =
    useTemporaryAccessCheck();

  const ADMIN_EMAILS = ["nickneessen@thestandardhq.com"];
  const isAdmin =
    supabaseUser?.email && ADMIN_EMAILS.includes(supabaseUser.email);

  // Super-admin check (nickneessen@thestandardhq.com only)
  const SUPER_ADMIN_EMAIL = "nickneessen@thestandardhq.com";
  const isSuperAdmin =
    supabaseUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Check if a subscription feature is available
  const hasFeature = (feature: FeatureKey | undefined): boolean => {
    if (!feature) return true; // No feature required
    if (isAdmin) return true; // Admin bypass

    // SECURITY: During loading, deny access to prevent exposure of premium features
    // UI should show loading skeleton instead of hiding/showing features
    if (subLoading || downlineLoading || tempAccessLoading) return false;

    // Check subscription plan features ONLY if subscription is active
    const features = subscription?.plan?.features;
    if (isSubscriptionActive && features?.[feature]) return true;

    // Check if user is direct downline of owner and feature is granted
    if (isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(feature)) {
      return true;
    }

    // Check temporary free access period (configurable via admin panel)
    // Uses database-driven config instead of hardcoded values
    if (shouldGrantTemporaryAccess(feature, supabaseUser?.email)) {
      return true;
    }

    return false;
  };

  const hasRole = (role: RoleName) => {
    return userRoles?.includes(role) || false;
  };

  const isRecruit = hasRole("recruit" as RoleName);

  // Super-admin always gets full access regardless of roles
  const isTrainerOnly =
    !isSuperAdmin &&
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

  // Helper to check if user email is in allowed list
  const currentUserEmail = supabaseUser?.email?.toLowerCase();
  const isEmailAllowed = (allowedEmails?: string[]) => {
    if (!allowedEmails || allowedEmails.length === 0) return true; // No restriction
    if (!currentUserEmail) return false;
    return allowedEmails.some(
      (email) => email.toLowerCase() === currentUserEmail,
    );
  };

  // Helper to check if user is in allowed agency
  const isAgencyAllowed = (allowedAgencyId?: string) => {
    if (!allowedAgencyId) return true; // No restriction
    if (isSuperAdmin) return true; // Super admin can access all
    return agency?.id === allowedAgencyId;
  };

  // Navigation logic:
  // - Recruits: Show ONLY recruit navigation
  // - Staff (trainer/contracting_manager only): Show staff navigation (trainer dashboard, training hub, messages, settings)
  // - Pending users: Show all items but rendered as locked
  // - Regular users: Show navigation based on permissions AND subscription features (hide locked items)
  const visibleNavItems = isRecruit
    ? recruitNavigationItems
    : isTrainerOnly
      ? staffNavigationItems.filter((item) => {
          // Public items always visible for staff
          if (item.public) return true;
          // Email whitelist check - show if user's email is in the list
          if (item.allowedEmails) {
            return isEmailAllowed(item.allowedEmails);
          }
          // Permission-based items
          if (!item.permission) return false;
          if (isLoading) return false;
          return can(item.permission);
        })
      : isPending
        ? navigationItems // Show all items for pending users (will be rendered as locked)
        : navigationItems.filter((item) => {
            // Agency restriction check - must pass first if specified
            if (
              item.allowedAgencyId &&
              !isAgencyAllowed(item.allowedAgencyId)
            ) {
              return false;
            }

            // Public items visible (after agency check passes)
            if (item.public) return true;

            // Super-admin only check
            if (item.superAdminOnly && !isSuperAdmin) return false;

            // Email whitelist check - if email is allowed, show item (skip other checks)
            if (item.allowedEmails) {
              if (isEmailAllowed(item.allowedEmails)) {
                return true; // Email is whitelisted, show the item
              }
              return false; // Has whitelist but email not in it, hide
            }

            // Permission check (role-based visibility)
            if (!item.permission) return false; // DEFAULT TO FALSE FOR SECURITY
            if (isLoading) return false;
            if (!can(item.permission)) return false;

            // Subscription feature check (HIDE if locked, not show with crown)
            // Check single feature
            if (
              item.subscriptionFeature &&
              !hasFeature(item.subscriptionFeature)
            ) {
              return false;
            }
            // Check array of features (any grants access)
            if (
              item.subscriptionFeatures &&
              !item.subscriptionFeatures.some((f) => hasFeature(f))
            ) {
              return false;
            }

            return true;
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

  // Super-admin items - ONLY visible to nickneessen@thestandardhq.com
  // Check email directly - no role dependencies, super-admin sees these regardless of any roles
  const visibleSuperAdminItems = isSuperAdmin ? superAdminNavigationItems : [];

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

            // Note: Subscription-locked items are now filtered out before rendering
            // so the crown icon rendering block has been removed.
            // Pending users still see all items with lock icons (handled above).

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

          {/* Separator for training/admin/super-admin section */}
          {(visibleTrainingItems.length > 0 ||
            visibleAdminItems.length > 0 ||
            visibleSuperAdminItems.length > 0) &&
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

          {/* Super Admin Navigation Items */}
          {visibleSuperAdminItems.length > 0 && !isCollapsed && (
            <div className="mt-2 mb-1 px-2 text-[10px] font-medium uppercase text-muted-foreground/60">
              System
            </div>
          )}
          {visibleSuperAdminItems.map((item) => {
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
          {/* Underwriting Tools */}
          {!isUnderwritingLoading && isUnderwritingEnabled && (
            <div className="space-y-1 mb-2">
              <Button
                variant="outline"
                className={`h-9 ${isCollapsed ? "w-9 p-0 mx-auto" : "w-full justify-start px-3"} border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30`}
                onClick={() => setIsUnderwritingWizardOpen(true)}
                title={isCollapsed ? "Underwriting Wizard" : ""}
              >
                <ShieldCheck
                  size={16}
                  className={isCollapsed ? "" : "mr-2.5"}
                />
                {!isCollapsed && <span className="text-sm">UW Wizard</span>}
              </Button>
              <Button
                variant="outline"
                className={`h-9 ${isCollapsed ? "w-9 p-0 mx-auto" : "w-full justify-start px-3"} border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30`}
                onClick={() => setIsQuickQuoteOpen(true)}
                title={isCollapsed ? "Quick Quote" : ""}
              >
                <Calculator size={16} className={isCollapsed ? "" : "mr-2.5"} />
                {!isCollapsed && <span className="text-sm">Quick Quote</span>}
              </Button>
            </div>
          )}
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

        {/* Underwriting Wizard Dialog */}
        {isUnderwritingEnabled && (
          <UnderwritingWizard
            open={isUnderwritingWizardOpen}
            onOpenChange={setIsUnderwritingWizardOpen}
          />
        )}

        {/* Quick Quote Dialog */}
        {isUnderwritingEnabled && (
          <QuickQuoteDialog
            open={isQuickQuoteOpen}
            onOpenChange={setIsQuickQuoteOpen}
          />
        )}
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
