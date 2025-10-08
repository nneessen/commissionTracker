// src/router.tsx
import React from "react";
import {
  RootRoute,
  Route,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import App from "./App";
import { ExpenseDashboard } from "./features/expenses";
import { CommissionList } from "./features/commissions";
import { PolicyDashboard } from "./features/policies";
import { AnalyticsDashboard } from "./features/analytics";
import { DashboardHome } from "./features/dashboard";
import { CompGuide } from "./features/comps";
import { SettingsDashboard } from "./features/settings";
import { Login, AuthCallback, ResetPassword, EmailVerificationPending } from "./features/auth";

// Create root route with App layout
const rootRoute = new RootRoute({
  component: () => (
    <>
      <App />
      <TanStackRouterDevtools />
    </>
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

// Login route with success handler
const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "login",
  component: () => {
    const navigate = useNavigate();
    const handleLoginSuccess = () => {
      navigate({ to: "/" });
    };
    return <Login onSuccess={handleLoginSuccess} />;
  },
});

// Auth callback route (for email confirmation)
const authCallbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "auth/callback",
  component: AuthCallback,
});

// Password reset route
const resetPasswordRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "auth/reset-password",
  component: ResetPassword,
});

// Email verification route
const verifyEmailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "auth/verify-email",
  component: EmailVerificationPending,
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

// Comp Guide route (replaces old settings)
const compGuideRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "comps",
  component: CompGuide,
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
  component: ExpenseDashboard,
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
  loginRoute,
  authCallbackRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  policiesRoute,
  analyticsRoute,
  compGuideRoute,
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