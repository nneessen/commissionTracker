// src/App.tsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "./components/layout";
import { useAuth } from "./contexts/AuthContext";
import { ImoProvider } from "./contexts/ImoContext";
import { logger } from "./services/base/logger";
import { ApprovalGuard } from "./components/auth/ApprovalGuard";
import { CookieConsentBanner } from "./features/legal";

function App() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const publicPaths = [
    "/login",
    "/auth/callback",
    "/auth/verify-email",
    "/auth/reset-password",
    "/auth/pending",
    "/auth/denied",
    "/terms",
    "/privacy",
  ];
  const isPublicPath = publicPaths.some((path) =>
    location.pathname.startsWith(path),
  );

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await signOut();
        navigate({ to: "/" });
      } catch (error) {
        logger.error(
          "Logout error",
          error instanceof Error ? error : String(error),
          "App",
        );
      }
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Track if user was ever authenticated to prevent redirect during initial load
  const wasAuthenticatedRef = useRef(false);

  // Update ref when user becomes authenticated
  useEffect(() => {
    if (user?.id) {
      wasAuthenticatedRef.current = true;
    }
  }, [user?.id]);

  // Redirect to login when no authenticated user
  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    // Skip public paths
    if (isPublicPath) return;

    // Skip if already on login
    if (location.pathname === "/login") return;

    // Redirect to login if no user
    // - On initial load with no session: redirect
    // - After logout (wasAuthenticatedRef was true): redirect
    // - During token refresh: user stays non-null, so no redirect
    if (!user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, isPublicPath, location.pathname, navigate]);

  if (loading && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isPublicPath) {
    return (
      <>
        <Toaster />
        <CookieConsentBanner />
        <Outlet />
      </>
    );
  }

  if (!user && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    );
  }

  // Guard: user must be non-null here
  if (!user) {
    return null;
  }

  return (
    <>
      <Toaster />
      <CookieConsentBanner />
      <ImoProvider>
        <div className="flex min-h-screen">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            userName={user.name || user.email?.split("@")[0] || "User"}
            userEmail={user.email || ""}
            onLogout={handleLogout}
          />

          <div className="main-content flex-1 min-w-0">
            <div className="p-6 w-full min-h-screen">
              <ApprovalGuard>
                <Outlet />
              </ApprovalGuard>
            </div>
          </div>
        </div>
      </ImoProvider>
    </>
  );
}

export default App;
