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
import { PolicyDashboard } from "./features/policies";
import { AnalyticsDashboard } from "./features/analytics";
import { DashboardHome } from "./features/dashboard";
import { CommissionGuide } from "./features/commission-guide";
import { SettingsDashboard } from "./features/settings";
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

// Commission Guide route (replaces old settings)
const commissionGuideRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "commission-guide",
  component: CommissionGuide,
});

// Settings route
const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: SettingsDashboard,
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
  commissionGuideRoute,
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