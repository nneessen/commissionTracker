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
import { ExpenseDashboardCompact } from "./features/expenses";
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
// PermissionGuard reserved for future granular route permissions
// import { PermissionGuard } from "./components/auth/PermissionGuard";
import { RouteGuard } from "./components/auth/RouteGuard";
import {
  OverrideDashboard,
  DownlinePerformance,
  HierarchyManagement,
} from "./features/hierarchy";
import { HierarchyDashboardCompact } from "./features/hierarchy/HierarchyDashboardCompact";
import { AgentDetailPage } from "./features/hierarchy/AgentDetailPage";
import { RecruitingDashboard } from "./features/recruiting/RecruitingDashboard";
import { PipelineAdminPage } from "./features/recruiting/admin/PipelineAdminPage";
import { MyRecruitingPipeline } from "./features/recruiting/pages/MyRecruitingPipeline";
import { TrainingHubPage } from "./features/training-hub";
import { MessagesPage } from "./features/messages";

// Create root route with App layout
const rootRoute = createRootRoute({
  component: () => (
    <>
      <App />
      <TanStackRouterDevtools />
    </>
  ),
});

// Dashboard/Home route - requires approval, blocks recruits
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <RouteGuard permission="nav.dashboard" noRecruits>
      <DashboardHome />
    </RouteGuard>
  ),
});

// Dashboard route (alias for home) - requires approval, blocks recruits
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "dashboard",
  component: () => (
    <RouteGuard permission="nav.dashboard" noRecruits>
      <DashboardHome />
    </RouteGuard>
  ),
});

// Login route with success handler
function LoginComponent() {
  const navigate = useNavigate();
  const handleLoginSuccess = () => {
    navigate({ to: "/" });
  };
  return <Login onSuccess={handleLoginSuccess} />;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: LoginComponent,
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

// Policies route - requires approval, blocks recruits
const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "policies",
  component: () => (
    <RouteGuard permission="nav.policies" noRecruits>
      <PolicyDashboard />
    </RouteGuard>
  ),
});

// Analytics route - requires approval, blocks recruits
const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "analytics",
  component: () => (
    <RouteGuard permission="nav.dashboard" noRecruits>
      <AnalyticsDashboard />
    </RouteGuard>
  ),
});

// Comp Guide route - Admin only (manages carriers, products, commission rates)
const compGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "comps",
  component: () => (
    <RouteGuard permission="carriers.manage" noRecruits>
      <CompGuide />
    </RouteGuard>
  ),
});

// Settings route - allow pending users
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: () => (
    <RouteGuard allowPending>
      <SettingsDashboard />
    </RouteGuard>
  ),
});

// Targets route - requires approval, blocks recruits
const targetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "targets",
  component: () => (
    <RouteGuard permission="nav.dashboard" noRecruits>
      <TargetsPage />
    </RouteGuard>
  ),
});

// Reports route - requires approval, blocks recruits
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "reports",
  component: () => (
    <RouteGuard permission="nav.downline_reports" noRecruits>
      <ReportsPage />
    </RouteGuard>
  ),
});

// Expenses route - requires approval, blocks recruits
const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "expenses",
  component: () => (
    <RouteGuard permission="expenses.read.own" noRecruits>
      <ExpenseDashboardCompact />
    </RouteGuard>
  ),
});

// Test route for debugging comp guide - Super-admin only
const testCompGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "test-comp",
  component: () => (
    <RouteGuard requireEmail="nick@nickneessen.com">
      <TestCompGuide />
    </RouteGuard>
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
    <RouteGuard permission="nav.user_management" noRecruits>
      <AdminControlCenter />
    </RouteGuard>
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
      })),
    );
    return (
      <RouteGuard requireEmail="nick@nickneessen.com">
        <AuthDiagnostic />
      </RouteGuard>
    );
  },
});

// Hierarchy routes - Agency hierarchy and override commissions
// All hierarchy routes require approval and block recruits
const hierarchyIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy",
  component: () => (
    <RouteGuard permission="nav.team_dashboard" noRecruits>
      <HierarchyDashboardCompact />
    </RouteGuard>
  ),
});

const hierarchyTreeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/tree",
  component: () => (
    <RouteGuard permission="nav.team_dashboard" noRecruits>
      <HierarchyDashboardCompact />
    </RouteGuard>
  ),
});

const hierarchyOverridesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/overrides",
  component: () => (
    <RouteGuard permission="nav.team_dashboard" noRecruits>
      <OverrideDashboard />
    </RouteGuard>
  ),
});

const hierarchyDownlinesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/downlines",
  component: () => (
    <RouteGuard permission="nav.team_dashboard" noRecruits>
      <DownlinePerformance />
    </RouteGuard>
  ),
});

const hierarchyManageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/manage",
  component: () => (
    <RouteGuard permission="nav.team_dashboard" noRecruits>
      <HierarchyManagement />
    </RouteGuard>
  ),
});

// Agent detail route - View individual agent information
const agentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "hierarchy/agent/$agentId",
  component: () => (
    <RouteGuard permission="nav.team_dashboard" noRecruits>
      <AgentDetailPage />
    </RouteGuard>
  ),
});

// Recruiting route - requires approval, blocks recruits (admin/recruiter view)
const recruitingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recruiting",
  component: () => (
    <RouteGuard permission="nav.recruiting_pipeline" noRecruits>
      <RecruitingDashboard />
    </RouteGuard>
  ),
});

// Recruiting admin route - pipeline management - Super-admin only
const recruitingAdminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recruiting/admin/pipelines",
  component: () => (
    <RouteGuard requireEmail="nick@nickneessen.com">
      <PipelineAdminPage />
    </RouteGuard>
  ),
});

// My Pipeline route - Recruit-only dashboard (allows pending, recruit access only)
const myPipelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recruiting/my-pipeline",
  component: () => (
    <RouteGuard recruitOnly allowPending>
      <MyRecruitingPipeline />
    </RouteGuard>
  ),
});

// Training Hub route - for trainers and contracting managers
const trainingHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "training-hub",
  component: () => (
    <RouteGuard permission="nav.training_hub" noRecruits>
      <TrainingHubPage />
    </RouteGuard>
  ),
});

// Messages route - Communications Hub
const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "messages",
  component: () => (
    <RouteGuard permission="nav.messages" noRecruits>
      <MessagesPage />
    </RouteGuard>
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
  agentDetailRoute,
  recruitingRoute,
  recruitingAdminRoute,
  myPipelineRoute,
  trainingHubRoute,
  messagesRoute,
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
