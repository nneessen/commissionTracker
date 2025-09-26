import React, { useState, useCallback } from "react";
import { Sidebar } from "./components/layout";
import { ExpenseManager } from "./features/expenses";
import { CommissionList } from "./features/commissions";
import { CalculationsDisplay } from "./features/calculations";
import { ConstantsManager, CarrierManager } from "./features/settings";
import "./App.css";

function App() {
  // State for user authentication
  const [user, setUser] = useState({
    name: "Nick Neessen",
    email: "nick@commissiontracker.io",
    isAuthenticated: true,
  });

  // Sidebar and navigation state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'commissions' | 'settings'>('dashboard');

  // Navigation handler
  const handleNavigation = useCallback((href: string) => {
    console.log("Navigating to:", href);
    // Simple view routing based on href
    if (href.includes('commissions')) {
      setActiveView('commissions');
    } else if (href.includes('settings')) {
      setActiveView('settings');
    } else {
      setActiveView('dashboard');
    }
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    if (window.confirm("Are you sure you want to logout?")) {
      setUser((prev) => ({ ...prev, isAuthenticated: false }));
      console.log("User logged out");
    }
  }, []);

  // Sidebar toggle handler
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'commissions':
        return <CommissionList />;
      case 'settings':
        return (
          <div className="settings-container">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
              <ConstantsManager />
            </div>
            <div>
              <CarrierManager />
            </div>
          </div>
        );
      default:
        return (
          <div className="dashboard-container">
            <ConstantsManager />
            <ExpenseManager />
            <CalculationsDisplay />
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        userName={user.name}
        userEmail={user.email}
        onLogout={handleLogout}
        onNavigate={handleNavigation}
      />

      <div className="main-content">
        <div className="app">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}

export default App;

