// src/App.tsx
import React, { useState, useEffect } from "react";
import {Outlet, useNavigate, useLocation} from "@tanstack/react-router";
import {Toaster} from "react-hot-toast";
import {Sidebar} from "./components/layout";
import {useAuth} from "./contexts/AuthContext";
import {ImoProvider} from "./contexts/ImoContext";
import {logger} from "./services/base/logger";
import {ApprovalGuard} from "./components/auth/ApprovalGuard";

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

  useEffect(() => {
    if (!user && !loading && !isPublicPath && location.pathname !== "/login") {
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
