// src/features/admin/components/AdminControlCenter.tsx
// Orchestration layer for Admin Center - manages tabs, shared state, and dialogs

import { useState, useMemo } from "react";
import {
  Users,
  Shield,
  Settings,
  UserCog,
  CheckCircle2,
  XCircle,
  UserPlus,
  CreditCard,
  TestTube,
  Store,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAllUsers, useCreateUser } from "@/hooks/admin";
import {
  useAllRolesWithPermissions,
  useIsAdmin,
  useAllPermissions,
} from "@/hooks/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AddUserDialog, { type NewUserData } from "./AddUserDialog";
import EditUserDialog from "./EditUserDialog";
import { Badge } from "@/components/ui/badge";
import type { RoleName } from "@/types/permissions.types";
import type { UserProfile } from "@/types/user.types";
import { hasStaffRole } from "@/constants/roles";
import { useImo } from "@/contexts/ImoContext";
import { useActiveTemplate, usePhases } from "@/features/recruiting";

// Tab components
import { UsersAccessTab } from "./UsersAccessTab";
import { RecruitingPipelineTab } from "./RecruitingPipelineTab";
import { RolesPermissionsTab } from "./RolesPermissionsTab";
import { SystemSettingsTab } from "./SystemSettingsTab";
import { SubscriptionPlansTab } from "./SubscriptionPlansTab";
import { TierTestingPanel } from "./TierTestingPanel";
import { LeadVendorsTab } from "./lead-vendors";

export default function AdminControlCenter() {
  // Tab navigation
  const [activeView, setActiveView] = useState<
    | "users"
    | "recruits"
    | "roles"
    | "system"
    | "subscriptions"
    | "lead-vendors"
    | "testing"
  >("users");

  // Shared dialog state (Edit User is used by both Users and Recruits tabs)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Shared data hooks
  const { user: currentUser } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const { data: roles } = useAllRolesWithPermissions();
  const { data: allPermissions } = useAllPermissions();
  const createUserMutation = useCreateUser();
  const { isSuperAdmin } = useImo();

  // Pipeline phases for graduation eligibility
  const { data: activeTemplate } = useActiveTemplate();
  const { data: pipelinePhases = [] } = usePhases(activeTemplate?.id);

  // Check if current user can graduate recruits
  const currentUserProfile = allUsers?.find((u) => u.id === currentUser?.id);
  const canGraduateRecruits = currentUserProfile?.roles?.some((role) =>
    ["admin", "trainer", "contracting_manager"].includes(role as string),
  );

  // Graduation-eligible phases: last 3 phases of the pipeline
  const graduationEligiblePhases = useMemo(() => {
    if (pipelinePhases.length === 0) return [];
    const sortedPhases = [...pipelinePhases].sort(
      (a, b) => a.phase_order - b.phase_order,
    );
    const lastThree = sortedPhases.slice(-3);
    return lastThree.map((phase) => phase.phase_name);
  }, [pipelinePhases]);

  // Hierarchy-based filtering for non-admin users
  const hierarchyFilteredUsers = isAdmin
    ? allUsers
    : allUsers?.filter((u: UserProfile) => {
        if (u.id === currentUser?.id) return true;
        if (u.hierarchy_path?.includes(currentUser?.id || "")) return true;
        return false;
      });

  // Helper to check if user is an agent/admin
  const isAgentOrAdmin = (u: UserProfile) =>
    u.roles?.includes("agent" as RoleName) ||
    u.roles?.includes("active_agent" as RoleName) ||
    u.is_admin === true;

  // Helper to check if user is a pure recruit
  const isPureRecruit = (u: UserProfile) => {
    if (!u.roles?.includes("recruit" as RoleName)) return false;
    if (isAgentOrAdmin(u)) return false;
    if (hasStaffRole(u.roles)) return false;
    return true;
  };

  // Users & Access tab: All users EXCEPT pure recruits
  const activeAgents = hierarchyFilteredUsers?.filter(
    (u: UserProfile) => !isPureRecruit(u),
  );

  // Recruiting Pipeline tab: Only pure recruits
  const recruitsInPipeline =
    hierarchyFilteredUsers?.filter((u: UserProfile) => isPureRecruit(u)) || [];

  // Calculate stats for header
  const totalUsers = activeAgents?.length || 0;
  const admins =
    activeAgents?.filter((u: UserProfile) => u.roles?.includes("admin"))
      .length || 0;
  const agents =
    activeAgents?.filter(
      (u: UserProfile) =>
        u.roles?.includes("agent") && !u.roles?.includes("admin"),
    ).length || 0;
  const approved = activeAgents?.length || 0;
  const pending = recruitsInPipeline.length;

  // Shared handlers
  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleAddUser = async (userData: NewUserData) => {
    const result = await createUserMutation.mutateAsync(userData);
    if (result.success) {
      setIsAddUserDialogOpen(false);

      if (result.inviteSent) {
        toast.success(
          `User created! Confirmation email sent to ${userData.email}`,
        );
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `User "${userData.first_name} ${userData.last_name}" created`,
        );
      }
    } else {
      toast.error(result.error || "Failed to create user");
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Admin Center
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-zinc-400" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {totalUsers}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">users</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-red-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {admins}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">admins</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <UserCog className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {agents}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">agents</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {approved}
              </span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-amber-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {pending}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact tabs */}
      <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
        <button
          onClick={() => setActiveView("users")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
            activeView === "users"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Users & Access
        </button>
        <button
          onClick={() => setActiveView("recruits")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
            activeView === "recruits"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Recruiting Pipeline
          {pending > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
              {pending}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveView("roles")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
            activeView === "roles"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveView("system")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
            activeView === "system"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          System Settings
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveView("subscriptions")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
              activeView === "subscriptions"
                ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Subscription Plans
          </button>
        )}
        {isSuperAdmin && (
          <button
            onClick={() => setActiveView("lead-vendors")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
              activeView === "lead-vendors"
                ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Lead Vendors
          </button>
        )}
        {isSuperAdmin && (
          <button
            onClick={() => setActiveView("testing")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
              activeView === "testing"
                ? "bg-white dark:bg-zinc-900 shadow-sm text-violet-700 dark:text-violet-300"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <TestTube className="h-3.5 w-3.5" />
            Tier Testing
          </button>
        )}
      </div>

      {/* Content area - Tab components */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === "users" && (
          <UsersAccessTab
            users={activeAgents}
            roles={roles}
            isLoading={usersLoading}
            isSuperAdmin={isSuperAdmin}
            onEditUser={handleEditUser}
            onAddUser={() => setIsAddUserDialogOpen(true)}
          />
        )}

        {activeView === "recruits" && (
          <RecruitingPipelineTab
            recruits={recruitsInPipeline}
            allUsers={allUsers}
            isLoading={usersLoading}
            canGraduateRecruits={canGraduateRecruits || false}
            graduationEligiblePhases={graduationEligiblePhases}
            onEditRecruit={handleEditUser}
          />
        )}

        {activeView === "roles" && (
          <RolesPermissionsTab
            roles={roles}
            allPermissions={allPermissions}
            activeAgents={activeAgents}
            isSuperAdmin={isSuperAdmin}
          />
        )}

        {activeView === "system" && <SystemSettingsTab />}

        {activeView === "subscriptions" && isSuperAdmin && (
          <SubscriptionPlansTab />
        )}

        {activeView === "lead-vendors" && isSuperAdmin && <LeadVendorsTab />}

        {activeView === "testing" && isSuperAdmin && <TierTestingPanel />}
      </div>

      {/* Shared dialogs */}
      <EditUserDialog
        user={editingUser}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["recruits"] });
        }}
      />

      <AddUserDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onSave={handleAddUser}
      />
    </div>
  );
}
