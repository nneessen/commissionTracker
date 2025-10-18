// src/App.tsx
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "./components/layout";
import { useAuth } from "./contexts/AuthContext";
import { logger } from "./services/base/logger";
import "./App.css";

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

  return (
    <>
      <Toaster />
      <div className="app-container">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          userName={user.name || user.email?.split("@")[0] || "User"}
          userEmail={user.email || ""}
          onLogout={handleLogout}
        />

        <div className="main-content">
          <div className="page-layout">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
