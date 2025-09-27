// src/router.tsx
import React from "react";
import {
  RootRoute,
  Route,
  createRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import App from "./App";
import { ExpenseManager } from "./features/expenses";
import { CommissionList } from "./features/commissions";
import { ConstantsManager, CarrierManager, ProductManager, AgentManager, AgentSettings, CompGuideManager, CompGuideViewer } from "./features/settings";
import { PolicyDashboard } from "./features/policies";
import { AnalyticsDashboard } from "./features/analytics";
import { DashboardHome } from "./features/dashboard";
import { ExpensesProvider } from "./contexts/ExpensesContext";

// Create root route with App layout and ExpensesProvider
const rootRoute = new RootRoute({
  component: () => (
    <ExpensesProvider>
      <App />
      <TanStackRouterDevtools />
    </ExpensesProvider>
  ),
});

// Dashboard/Home route
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardHome,
});

// Dashboard route (alias for home)
const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "dashboard",
  component: DashboardHome,
});

// Policies route
const policiesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "policies",
  component: PolicyDashboard,
});

// Analytics route
const analyticsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "analytics",
  component: AnalyticsDashboard,
});


// Settings route
const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: () => (
    <div className="settings-container p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your agent profile, carriers, products, and compensation guides</p>
      </div>

      {/* Agent Settings - Most Important */}
      <div className="mb-8">
        <AgentSettings />
      </div>

      {/* Data Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-8">
          <CarrierManager />
        </div>
        <div className="space-y-8">
          <ProductManager />
        </div>
      </div>

      {/* Compensation Guide Section */}
      <div className="mb-8">
        <CompGuideViewer />
      </div>

      {/* Additional Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ConstantsManager />
        </div>
        <div>
          <AgentManager />
        </div>
      </div>
    </div>
  ),
});

// Targets route (coming soon)
const targetsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "targets",
  component: () => (
    <div className="coming-soon-container p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Targets</h2>
      <p className="text-gray-600">This feature is coming soon!</p>
    </div>
  ),
});

// Reports route (coming soon)
const reportsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "reports",
  component: () => (
    <div className="coming-soon-container p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports</h2>
      <p className="text-gray-600">This feature is coming soon!</p>
    </div>
  ),
});

// Expenses route
const expensesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "expenses",
  component: ExpenseManager,
});

// Clients route (coming soon)
const clientsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "clients",
  component: () => (
    <div className="coming-soon-container p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Clients</h2>
      <p className="text-gray-600">This feature is coming soon!</p>
    </div>
  ),
});

// Create the route tree - all routes are already linked via getParentRoute
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  policiesRoute,
  analyticsRoute,
  settingsRoute,
  targetsRoute,
  reportsRoute,
  expensesRoute,
  clientsRoute,
]);

// Create and export the router
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

// Type declaration for TypeScript
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}