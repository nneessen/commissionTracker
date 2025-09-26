// src/App.tsx
import React, { useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./components/layout";
import "./App.css";

function App() {
  // State for user authentication
  const [user, setUser] = useState({
    name: "Nick Neessen",
    email: "nick@commissiontracker.io",
    isAuthenticated: true,
  });

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // Logout handler
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      setUser((prev) => ({ ...prev, isAuthenticated: false }));
      console.log("User logged out");
      navigate({ to: "/" });
    }
  };

  // Sidebar toggle handler
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="app-container">
      {user.isAuthenticated && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          userName={user.name}
          userEmail={user.email}
          onLogout={handleLogout}
        />
      )}

      <div className="main-content">
        <div className="app">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default App;