// src/components/layout/RecruitHeader.tsx
// Minimal brutalist header for recruit pipeline - logout and theme toggle

import { useState, useEffect } from "react";
import { LogOut, Sun, Moon, User } from "lucide-react";
import { useTheme } from "next-themes";

interface RecruitHeaderProps {
  userName: string;
  onLogout: () => void;
}

export function RecruitHeader({ userName, onLogout }: RecruitHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 md:h-14">
          {/* Left - Brand */}
          <div className="flex items-center gap-3">
            <span
              className="text-lg md:text-xl font-black tracking-tighter"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: "var(--recruiting-primary)",
              }}
            >
              THE STANDARD
            </span>
            <span className="hidden md:inline font-mono text-[10px] text-white/30 tracking-[0.2em] uppercase">
              ONBOARDING
            </span>
          </div>

          {/* Right - User info + Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* User name */}
            <div className="hidden md:flex items-center gap-2 text-white/50 text-xs">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono">{userName}</span>
            </div>

            {/* Divider */}
            <div
              className="hidden md:block h-4 w-[1px]"
              style={{ background: "var(--recruiting-border)" }}
            />

            {/* Theme toggle - only render after mount to prevent hydration mismatch */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
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
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: "var(--recruiting-primary)", opacity: 0.3 }}
      />
    </header>
  );
}
