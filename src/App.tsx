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
import { getDisplayName } from "./types/user.types";
import { SubscriptionAnnouncementDialog } from "./components/subscription";
import { useSubscriptionAnnouncement } from "./hooks/subscription";
import { PublicJoinPage } from "./features/recruiting/pages/PublicJoinPage";
import { PublicLandingPage } from "./features/landing";

// Primary domains (not custom domains)
const PRIMARY_DOMAINS = [
  "thestandardhq.com",
  "www.thestandardhq.com",
  "localhost",
  "127.0.0.1",
];

const isVercelPreview = (hostname: string) =>
  hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel.sh");

function App() {
  const location = useLocation();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  // Check if we're on a custom domain
  const isOnCustomDomain =
    hostname &&
    !PRIMARY_DOMAINS.includes(hostname) &&
    !isVercelPreview(hostname);

  // Check if public path BEFORE calling useAuth to avoid unnecessary auth checks
  const publicPaths = [
    "/login",
    "/auth/callback",
    "/auth/verify-email",
    "/auth/reset-password",
    "/auth/pending",
    "/auth/denied",
    "/terms",
    "/privacy",
    "/join-",
    "/join/",
    "/register/",
    "/test-register/",
  ];
  const isPublicPath = publicPaths.some((path) =>
    location.pathname.startsWith(path),
  );

  // Custom domain at root path should show recruiting page
  if (isOnCustomDomain && location.pathname === "/") {
    return (
      <>
        <Toaster />
        <CookieConsentBanner />
        <PublicJoinPage />
      </>
    );
  }

  // Primary domain at root path should show public landing page
  const isOnPrimaryDomain =
    PRIMARY_DOMAINS.includes(hostname) || isVercelPreview(hostname);

  if (isOnPrimaryDomain && location.pathname === "/") {
    return (
      <>
        <Toaster />
        <CookieConsentBanner />
        <PublicLandingPage />
      </>
    );
  }

  // For public paths, render immediately without auth
  if (isPublicPath) {
    return (
      <>
        <Toaster />
        <CookieConsentBanner />
        <Outlet />
      </>
    );
  }

  // Only use auth for non-public paths
  return <AuthenticatedApp />;
}

// Separate component for authenticated routes
function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { shouldShow: showAnnouncement, dismiss: dismissAnnouncement } =
    useSubscriptionAnnouncement();

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
    if (loading) return;
    if (location.pathname === "/login") return;

    if (!user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <CookieConsentBanner />
      <SubscriptionAnnouncementDialog
        open={showAnnouncement}
        onDismiss={dismissAnnouncement}
      />
      <ImoProvider>
        <div className="flex min-h-screen">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            userName={
              user.first_name && user.last_name
                ? getDisplayName({
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email || "",
                  })
                : user.email?.split("@")[0] || "User"
            }
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
