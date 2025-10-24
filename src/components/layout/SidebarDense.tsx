// src/components/layout/SidebarDense.tsx
import React, { useState, useEffect, memo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronRight,
} from "lucide-react";

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string | number;
}

interface SidebarDenseProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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

// Memoized navigation item for performance
const NavItem = memo(({
  item,
  isActive,
  isCollapsed,
  onClick
}: {
  item: NavigationItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}) => {
  const Icon = item.icon;

  const linkContent = (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-150",
        "hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring",
        isActive && "bg-muted font-medium",
        isCollapsed && "justify-center px-2"
      )}
      onClick={onClick}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="text-sm truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
});

NavItem.displayName = "NavItem";

export const SidebarDense: React.FC<SidebarDenseProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  userName = "User",
  userEmail = "",
  onLogout,
}) => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const closeMobile = () => setIsMobileOpen(false);

  // Calculate sidebar width for smooth transitions
  const sidebarWidth = isCollapsed ? "72px" : "220px";

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 lg:hidden h-8 w-8"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r transition-all duration-200 ease-in-out z-40",
          "flex flex-col",
          isMobile && !isMobileOpen && "-translate-x-full",
          isMobile && isMobileOpen && "translate-x-0"
        )}
        style={{
          width: isMobile ? "220px" : sidebarWidth,
        }}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{userName}</span>
              <span className="text-[11px] text-muted-foreground truncate">
                {userEmail}
              </span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <NavItem
                  item={item}
                  isActive={location.pathname === item.href}
                  isCollapsed={isCollapsed}
                  onClick={isMobile ? closeMobile : undefined}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t p-2 space-y-1">
          <div className={cn(
            "flex items-center gap-2",
            isCollapsed && "justify-center"
          )}>
            <ThemeToggle />
            {!isCollapsed && (
              <span className="text-[11px] text-muted-foreground">Theme</span>
            )}
          </div>

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start h-8",
                isCollapsed && "justify-center px-2"
              )}
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2 text-sm">Logout</span>}
            </Button>
          )}
        </div>
      </aside>

      {/* Main content offset */}
      {!isMobile && (
        <div
          className="sidebar-offset transition-all duration-200 ease-in-out"
          style={{ marginLeft: sidebarWidth }}
        />
      )}
    </>
  );
};

export default SidebarDense;