// src/App.tsx
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { Sidebar } from "./components/layout";
import { useAuth } from "./contexts/AuthContext";
import { logger } from "./services/base/logger";
import "./App.css";

function App() {
  // Get authentication state from AuthContext
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // Public routes that don't require authentication
  const publicPaths = ['/login', '/auth/callback', '/auth/verify-email', '/auth/reset-password'];
  const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));

  // Logout handler
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await signOut();
        navigate({ to: "/" });
      } catch (error) {
        logger.error("Logout error", error instanceof Error ? error : String(error), "App");
      }
    }
  };

  // Sidebar toggle handler
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };


  // Show loading state while checking authentication
  // BUT don't show it on public paths (login, auth callback, etc) to avoid unmounting forms
  if (loading && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Allow public auth routes to render even without authentication
  if (isPublicPath) {
    return <Outlet />;
  }

  // Protected routes - require authentication
  if (!user) {
    // Redirect to login route instead of rendering Login directly
    // This ensures Login component is always rendered via router with consistent props
    navigate({ to: "/login" });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    );
  }

  // Authenticated user - show app with sidebar and routes
  return (
    <div className="app-container">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        userName={user.name || user.email?.split('@')[0] || 'User'}
        userEmail={user.email || ''}
        onLogout={handleLogout}
      />

      <div className="main-content">
        <div className="app">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default App;