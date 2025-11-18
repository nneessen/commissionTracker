// src/router.tsx
import {
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import App from "./App";
import { ExpenseDashboard } from "./features/expenses";
import { PolicyDashboard } from "./features/policies";
import { AnalyticsDashboard } from "./features/analytics";
import { DashboardHome } from "./features/dashboard";
import { CompGuide } from "./features/comps";
import { SettingsDashboard } from "./features/settings";
import { TargetsPage } from "./features/targets";
import { TestCompGuide } from "./features/test/TestCompGuide";
import {
  Login,
  AuthCallback,
  ResetPassword,
  EmailVerificationPending,
} from "./features/auth";
import { ReportsPage } from "./features/reports";

// Create root route with App layout
const rootRoute = createRootRoute({
  component: () => (
    <>
      <App />
      <TanStackRouterDevtools />
    </>
  ),
});

// Dashboard/Home route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardHome,
});

// Dashboard route (alias for home)
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "dashboard",
  component: DashboardHome,
});

// Login route with success handler
const loginRoute = createRoute({
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
const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/callback",
  component: AuthCallback,
});

// Password reset route
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/reset-password",
  component: ResetPassword,
});

// Email verification route
const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/verify-email",
  component: EmailVerificationPending,
});

// Policies route
const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "policies",
  component: PolicyDashboard,
});

// Analytics route
const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "analytics",
  component: AnalyticsDashboard,
});

// Comp Guide route (replaces old settings)
const compGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "comps",
  component: CompGuide,
});

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: SettingsDashboard,
});

// Targets route
const targetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "targets",
  component: TargetsPage,
});

// Reports route
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "reports",
  component: ReportsPage,
});

// Expenses route
const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "expenses",
  component: ExpenseDashboard,
});

// Test route for debugging comp guide
const testCompGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "test-comp",
  component: TestCompGuide,
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
  testCompGuideRoute,
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

