// src/App.tsx
import React, { useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./components/layout";
import { useAuth } from "./contexts/AuthContext";
import { Login } from "./features/auth/Login";
import { logger } from "./services/base/logger";
import "./App.css";

function App() {
  // Get authentication state from AuthContext
  const { user, loading, signOut } = useAuth();

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

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

  // Handle successful login
  const handleLoginSuccess = () => {
    navigate({ to: "/" });
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login onSuccess={handleLoginSuccess} />;
  }

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