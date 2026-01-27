// src/components/layout/FreeUserHeader.tsx
// Minimal header for Free tier users when sidebar is hidden
// Provides logout, theme toggle, settings, and policies navigation

import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { LogOut, Sun, Moon, Settings, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FreeUserHeaderProps {
  userName: string;
  userEmail?: string;
  onLogout: () => void;
}

export function FreeUserHeader({
  userName,
  userEmail,
  onLogout,
}: FreeUserHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isOnPolicies = location.pathname === "/policies";
  const isOnSettings = location.pathname.startsWith("/settings");

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left - Brand/User + Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 border border-border">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm font-semibold text-foreground truncate">
                  {userName}
                </div>
                {userEmail && (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {userEmail}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 ml-2">
              <Link to="/policies">
                <Button
                  variant={isOnPolicies ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5",
                    isOnPolicies && "bg-secondary"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Policies</span>
                </Button>
              </Link>
              <Link to="/settings">
                <Button
                  variant={isOnSettings ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5",
                    isOnSettings && "bg-secondary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle - only render after mount */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                title={
                  resolvedTheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Logout button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="h-9 gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
