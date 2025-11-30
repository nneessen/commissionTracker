// src/router.tsx
import { lazy } from "react";
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
  PendingApproval,
  DeniedAccess,
} from "./features/auth";
import { ReportsPage } from "./features/reports";
import AdminControlCenter from "./features/admin/components/AdminControlCenter";
import { PermissionGuard } from "./components/auth/PermissionGuard";
import {
  OverrideDashboard,
  DownlinePerformance,
  HierarchyManagement,
  HierarchyDashboard,
} from "./features/hierarchy";
import { RecruitingDashboard } from "./features/recruiting/RecruitingDashboard";
import { PipelineAdminPage } from "./features/recruiting/admin/PipelineAdminPage";
import { MyRecruitingPipeline } from "./features/recruiting/pages/MyRecruitingPipeline";

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

// Comp Guide route - Admin only (manages carriers, products, commission rates)
const compGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "comps",
  component: () => (
    <PermissionGuard permission="carriers.manage">
      <CompGuide />
    </PermissionGuard>
  ),
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

// Test route for debugging comp guide - Super-admin only
const testCompGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "test-comp",
  component: () => (
    <PermissionGuard requireEmail="nick@nickneessen.com">
      <TestCompGuide />
    </PermissionGuard>
  ),
});

// Pending approval route
const pendingApprovalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/pending",
  component: PendingApproval,
});

// Denied access route
const deniedAccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/denied",
  component: DeniedAccess,
});

// Admin Control Center route - consolidated admin interface
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "admin",
  component: () => (
    <PermissionGuard permission="nav.user_management">
      <AdminControlCenter />
    </PermissionGuard>
  ),
});

// Diagnostic route for troubleshooting auth issues - Super-admin only
const authDiagnosticRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "admin/auth-diagnostic",
  component: () => {
    const AuthDiagnostic = lazy(() =>
      import("./features/admin/components/AuthDiagnostic").then((m) => ({
        default: m.AuthDiagnostic,
      }))
    );
    return (
      <PermissionGuard requireEmail="nick@nickneessen.com">
        <AuthDiagnostic />
      </PermissionGuard>
    );
  },
});

// Hierarchy routes - Agency hierarchy and override commissions
const hierarchyIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy",
  component: HierarchyDashboard,
});

const hierarchyTreeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/tree",
  component: HierarchyDashboard, // HierarchyTree requires props, use dashboard instead
});

const hierarchyOverridesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/overrides",
  component: OverrideDashboard,
});

const hierarchyDownlinesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/downlines",
  component: DownlinePerformance,
});

const hierarchyManageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/manage",
  component: HierarchyManagement,
});

// Recruiting route
const recruitingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recruiting",
  component: RecruitingDashboard,
});

// Recruiting admin route - pipeline management - Super-admin only
const recruitingAdminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recruiting/admin/pipelines",
  component: () => (
    <PermissionGuard requireEmail="nick@nickneessen.com">
      <PipelineAdminPage />
    </PermissionGuard>
  ),
});

// My Pipeline route - Recruit-specific dashboard
const myPipelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recruiting/my-pipeline",
  component: MyRecruitingPipeline,
});

// Create the route tree - all routes are already linked via getParentRoute
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  loginRoute,
  authCallbackRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  pendingApprovalRoute,
  deniedAccessRoute,
  adminRoute,
  authDiagnosticRoute,
  policiesRoute,
  analyticsRoute,
  compGuideRoute,
  settingsRoute,
  targetsRoute,
  reportsRoute,
  expensesRoute,
  testCompGuideRoute,
  hierarchyIndexRoute,
  hierarchyTreeRoute,
  hierarchyOverridesRoute,
  hierarchyDownlinesRoute,
  hierarchyManageRoute,
  recruitingRoute,
  recruitingAdminRoute,
  myPipelineRoute,
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

