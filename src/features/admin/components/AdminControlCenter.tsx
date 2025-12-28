// src/features/admin/components/AdminControlCenter.tsx
// Redesigned with zinc palette and compact design patterns

import { useState } from "react";
import {
  Users,
  Shield,
  Settings,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  UserCog,
  ScrollText,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useAllUsers, useDeleteUser } from "@/hooks/admin/useUserApproval";
import {
  useAllRolesWithPermissions,
  useUpdateUserRoles,
  useIsAdmin,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAllPermissions,
  useAssignPermissionToRole,
  useRemovePermissionFromRole,
} from "@/hooks/permissions/usePermissions";
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from "@/services/permissions/permissionService";
import type {
  Role,
  Permission,
  PermissionWithSource,
} from "@/types/permissions.types";
// Checkbox and ScrollArea moved to RolePermissionEditor component
import { useAuth } from "@/contexts/AuthContext";
import { userApprovalService } from "@/services/users/userService";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AddUserDialog, { type NewUserData } from "./AddUserDialog";
import EditUserDialog from "./EditUserDialog";
import { GraduateToAgentDialog } from "./GraduateToAgentDialog";
import { RolePermissionEditor } from "./RolePermissionEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RoleName } from "@/types/permissions.types";
import type { UserProfile } from "@/services/users/userService";
import { getFullName, getDisplayName } from "@/types/user.types";
import { useImo } from "@/contexts/ImoContext";
import {
  useAllActiveImos,
  useMyImoAgencies,
  useAllActiveAgencies,
} from "@/hooks/imo/useImoQueries";

export default function AdminControlCenter() {
  const [activeView, setActiveView] = useState<
    "users" | "recruits" | "roles" | "system"
  >("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [graduatingRecruit, setGraduatingRecruit] =
    useState<UserProfile | null>(null);
  const [isGraduateDialogOpen, setIsGraduateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Role management state
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState<
    Partial<CreateRoleInput & UpdateRoleInput>
  >({
    name: "",
    display_name: "",
    description: "",
  });

  const { user: currentUser } = useAuth();
  const { data: isAdmin, isLoading: _isAdminLoading } = useIsAdmin();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const { data: roles } = useAllRolesWithPermissions();
  const { mutate: _updateUserRoles } = useUpdateUserRoles();
  const deleteUserMutation = useDeleteUser();
  const queryClient = useQueryClient();

  // Role mutation hooks
  const createRoleMutation = useCreateRole();
  const _updateRoleMutation = useUpdateRole(); // Available for future role name/description edits
  const deleteRoleMutation = useDeleteRole();
  const assignPermissionMutation = useAssignPermissionToRole();
  const removePermissionMutation = useRemovePermissionFromRole();

  // All available permissions for assignment
  const { data: allPermissions } = useAllPermissions();

  // IMO/Agency data for displaying organization info
  const { isSuperAdmin } = useImo();
  // LOW-1 fix: Only fetch all IMOs for super admins
  const { data: allImos } = useAllActiveImos({ enabled: isSuperAdmin });
  const { data: myAgencies } = useMyImoAgencies();
  // MEDIUM-4 fix: Super admins need all agencies to display cross-IMO users
  const { data: allAgencies } = useAllActiveAgencies();

  // Helper to get IMO name by ID
  const getImoName = (imoId: string | null) => {
    if (!imoId) return "-";
    return allImos?.find((imo) => imo.id === imoId)?.code || "-";
  };

  // Helper to get Agency name by ID (MEDIUM-4 fix: use allAgencies for super admins)
  const getAgencyName = (agencyId: string | null) => {
    if (!agencyId) return "-";
    const agencies = isSuperAdmin ? allAgencies : myAgencies;
    return agencies?.find((a) => a.id === agencyId)?.code || "-";
  };

  // Check if current user can graduate recruits (Admin, Trainer, or Contracting Manager)
  const currentUserProfile = allUsers?.find((u) => u.id === currentUser?.id);
  const canGraduateRecruits = currentUserProfile?.roles?.some((role) =>
    ["admin", "trainer", "contracting_manager"].includes(role as string),
  );

  // Hierarchy-based filtering for non-admin users
  const hierarchyFilteredUsers = isAdmin
    ? allUsers
    : allUsers?.filter((u: UserProfile) => {
        if (u.id === currentUser?.id) return true;
        if (u.hierarchy_path?.includes(currentUser?.id || "")) return true;
        return false;
      });

  // Separate active agents from recruits based on ROLES
  // A user is an "active agent" if they have 'agent' OR 'active_agent' role, OR is_admin
  const isActiveAgent = (u: UserProfile) =>
    u.roles?.includes("agent" as RoleName) ||
    u.roles?.includes("active_agent" as RoleName) ||
    u.is_admin === true;

  const activeAgents = hierarchyFilteredUsers?.filter(isActiveAgent);

  // Recruits are users who have neither 'agent' nor 'active_agent' role and are not admins
  const recruitsInPipeline =
    hierarchyFilteredUsers?.filter((u: UserProfile) => !isActiveAgent(u)) || [];

  // Calculate stats
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
  const pending = recruitsInPipeline?.length || 0;

  // Search filtering
  const filteredUsers = activeAgents?.filter((user: UserProfile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = getFullName(user);
    return (
      user.email?.toLowerCase().includes(query) ||
      fullName.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const pendingRecruits = recruitsInPipeline;

  const getRoleColor = (roleName: RoleName): string => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      agent: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      upline_manager:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      trainer:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      recruiter:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    };
    return (
      colors[roleName] ||
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
    );
  };

  const getRoleDisplayName = (roleName: RoleName): string => {
    const role = roles?.find((r) => r.name === roleName);
    return role?.display_name || roleName;
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleAddUser = async (userData: NewUserData) => {
    const result = await userApprovalService.createUser(userData);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ["userApproval"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${userName}? This cannot be undone.`,
      )
    ) {
      return;
    }

    // Use mutation hook for proper cache invalidation
    deleteUserMutation.mutate(userId, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(`${userName} deleted`);
          // Query invalidation is handled by the mutation hook
        } else {
          toast.error(result.error || "Failed to delete user");
        }
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete user",
        );
      },
    });
  };

  // Role management handlers
  const openCreateRoleDialog = () => {
    setRoleFormData({ name: "", display_name: "", description: "" });
    setSelectedRole(null);
    setIsCreateRoleDialogOpen(true);
  };

  const openEditRoleDialog = (role: Role) => {
    // Fetch the full role with permissions from the roles list
    const fullRole = roles?.find((r) => r.id === role.id);
    setSelectedRole(fullRole || role);
    setRoleFormData({
      display_name: role.display_name,
      description: role.description || "",
    });
    setIsEditRoleDialogOpen(true);
  };

  // Toggle a permission on/off for the selected role
  const handleTogglePermission = async (permission: Permission) => {
    if (!selectedRole) return;

    const currentPermissions = selectedRole.permissions || [];
    const hasPermission = currentPermissions.some(
      (p) => p.id === permission.id,
    );

    try {
      if (hasPermission) {
        await removePermissionMutation.mutateAsync({
          roleId: selectedRole.id,
          permissionId: permission.id,
        });
        // Update local state
        setSelectedRole((prev) =>
          prev
            ? {
                ...prev,
                permissions: prev.permissions?.filter(
                  (p) => p.id !== permission.id,
                ),
              }
            : null,
        );
        toast.success(`Removed "${permission.code}" from ${selectedRole.name}`);
      } else {
        await assignPermissionMutation.mutateAsync({
          roleId: selectedRole.id,
          permissionId: permission.id,
        });
        // Update local state - add as direct permission
        const permissionWithSource: PermissionWithSource = {
          ...permission,
          permissionType: "direct",
        };
        setSelectedRole((prev) =>
          prev
            ? {
                ...prev,
                permissions: [
                  ...(prev.permissions || []),
                  permissionWithSource,
                ],
              }
            : null,
        );
        toast.success(`Added "${permission.code}" to ${selectedRole.name}`);
      }
    } catch (error) {
      console.error("[AdminControlCenter] Toggle permission error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update permission",
      );
    }
  };

  const openDeleteRoleDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteRoleDialogOpen(true);
  };

  const handleCreateRole = async () => {
    if (!roleFormData.name || !roleFormData.display_name) {
      toast.error("Name and Display Name are required");
      return;
    }

    try {
      await createRoleMutation.mutateAsync(roleFormData as CreateRoleInput);
      toast.success(`Role "${roleFormData.display_name}" created`);
      setIsCreateRoleDialogOpen(false);
      setRoleFormData({ name: "", display_name: "", description: "" });
    } catch (error) {
      console.error("[AdminControlCenter] Create role error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create role",
      );
    }
  };

  // Note: handleUpdateRole removed - permission management now uses handleTogglePermission

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await deleteRoleMutation.mutateAsync(selectedRole.id);
      toast.success(`Role "${selectedRole.display_name}" deleted`);
      setIsDeleteRoleDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error("[AdminControlCenter] Delete role error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete role",
      );
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
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === "users" && (
          <div className="flex flex-col h-full space-y-2">
            {/* Compact controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-7 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-zinc-500 dark:text-zinc-400">Show</span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setIsAddUserDialogOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add User
              </Button>
            </div>

            {/* Data table */}
            <div className="flex-1 overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              {usersLoading ? (
                <div className="p-3 space-y-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                    <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[180px]">
                        User
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[120px]">
                        Roles
                      </TableHead>
                      {isSuperAdmin && (
                        <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[70px]">
                          IMO
                        </TableHead>
                      )}
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px]">
                        Agency
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[65px]">
                        Status
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[55px]">
                        Level
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[60px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers?.map((user: UserProfile) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                      >
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                              {user.first_name?.charAt(0)?.toUpperCase() ||
                                user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                {getDisplayName(user)}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {user.roles?.slice(0, 2).map((roleName) => (
                              <Badge
                                key={roleName}
                                className={`${getRoleColor(roleName as RoleName)} text-[10px] px-1 py-0 h-4 border-0`}
                                variant="secondary"
                              >
                                {getRoleDisplayName(roleName as RoleName)}
                              </Badge>
                            ))}
                            {(user.roles?.length || 0) > 2 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4 border-zinc-300 dark:border-zinc-600"
                              >
                                +{(user.roles?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="py-1.5">
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                              {getImoName(user.imo_id)}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="py-1.5">
                          <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                            {getAgencyName(user.agency_id)}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          {user.approval_status === "approved" ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] h-4 px-1"
                            >
                              OK
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] h-4 px-1"
                            >
                              Pend
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                            {user.contract_level || "-"}%
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                              onClick={() => handleEditUser(user)}
                              title="Edit user"
                            >
                              <Edit className="h-2.5 w-2.5 mr-0.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() =>
                                handleDeleteUser(user.id, getDisplayName(user))
                              }
                              title="Delete user"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedUsers?.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={isSuperAdmin ? 7 : 6}
                          className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-[11px]">
                <div className="text-zinc-500 dark:text-zinc-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredUsers?.length || 0,
                  )}{" "}
                  of {filteredUsers?.length || 0} users
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 border-zinc-200 dark:border-zinc-700"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => (
                        <span key={`page-${page}`}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-1 text-zinc-400">...</span>
                          )}
                          <Button
                            size="sm"
                            variant={currentPage === page ? "default" : "ghost"}
                            className="h-6 w-6 p-0 text-[11px]"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </span>
                      ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 border-zinc-200 dark:border-zinc-700"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "recruits" && (
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {pending}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    pending recruits
                  </span>
                </div>
              </div>
            </div>

            {/* Recruits table */}
            <div className="flex-1 overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              {usersLoading ? (
                <div className="p-3 space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                    <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[180px]">
                        Recruit
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[130px]">
                        Upline
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                        Resident State
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[90px]">
                        Applied
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                        Phase
                      </TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRecruits?.map((recruit: UserProfile) => {
                      const recruitName =
                        recruit.first_name && recruit.last_name
                          ? `${recruit.first_name} ${recruit.last_name}`
                          : recruit.email;

                      const uplineName = recruit.upline
                        ? recruit.upline.first_name && recruit.upline.last_name
                          ? `${recruit.upline.first_name} ${recruit.upline.last_name}`
                          : recruit.upline.email
                        : null;

                      const currentPhase =
                        recruit.current_onboarding_phase ||
                        recruit.onboarding_status ||
                        "Not Started";

                      return (
                        <TableRow
                          key={recruit.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                        >
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-[10px] font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                                {recruitName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                  {recruitName}
                                </div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
                                  {recruit.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5">
                            {uplineName ? (
                              <div className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
                                {uplineName}
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                              {recruit.resident_state || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {recruit.created_at
                                ? new Date(
                                    recruit.created_at,
                                  ).toLocaleDateString()
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge
                              variant="outline"
                              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px] h-4 px-1"
                            >
                              {currentPhase.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                                onClick={() => handleEditUser(recruit)}
                                title="View/Edit full profile"
                              >
                                <Edit className="h-2.5 w-2.5 mr-0.5" />
                                Edit
                              </Button>
                              {canGraduateRecruits &&
                                [
                                  "bootcamp",
                                  "npn_received",
                                  "contracting",
                                ].includes(
                                  recruit.current_onboarding_phase || "",
                                ) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                    onClick={() => {
                                      setGraduatingRecruit(recruit);
                                      setIsGraduateDialogOpen(true);
                                    }}
                                    title="Graduate to Agent"
                                  >
                                    <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
                                    Graduate
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {pendingRecruits?.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
                        >
                          No pending recruits
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {activeView === "roles" && (
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <ScrollText className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {roles?.length || 0}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    total roles
                  </span>
                </div>
              </div>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={openCreateRoleDialog}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Role
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Table>
                <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                  <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[200px]">
                      Role Name
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Description
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                      Permissions
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                      Users
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[120px]">
                      System Role
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles?.map((role) => (
                    <TableRow
                      key={role.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <TableCell className="py-1.5">
                        <div className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100">
                          {role.display_name}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate max-w-md">
                          {role.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          {role.permissions?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          {activeAgents?.filter((u: UserProfile) =>
                            u.roles?.includes(role.name as RoleName),
                          ).length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {role.is_system_role && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-zinc-300 dark:border-zinc-600"
                          >
                            System
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                              onClick={() => openEditRoleDialog(role)}
                              title="Manage role permissions"
                            >
                              <Edit className="h-2.5 w-2.5 mr-0.5" />
                              Permissions
                            </Button>
                          )}
                          {isSuperAdmin && !role.is_system_role && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => openDeleteRoleDialog(role)}
                              title="Delete role"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeView === "system" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-10 w-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                System Settings - Coming soon
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
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

      {/* Graduate to Agent Dialog */}
      {graduatingRecruit && (
        <GraduateToAgentDialog
          recruit={graduatingRecruit}
          open={isGraduateDialogOpen}
          onOpenChange={(open) => {
            setIsGraduateDialogOpen(open);
            if (!open) setGraduatingRecruit(null);
          }}
        />
      )}

      {/* Add User Dialog */}
      <AddUserDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onSave={handleAddUser}
      />

      {/* Create Role Dialog */}
      <Dialog
        open={isCreateRoleDialogOpen}
        onOpenChange={setIsCreateRoleDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create New Role</DialogTitle>
            <DialogDescription className="text-[11px]">
              Create a custom role with specific permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Role Name (slug)</Label>
              <Input
                placeholder="e.g., sales_lead"
                className="h-8 text-[11px]"
                value={roleFormData.name || ""}
                onChange={(e) =>
                  setRoleFormData((prev) => ({
                    ...prev,
                    name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  }))
                }
              />
              <p className="text-[10px] text-zinc-500">
                Lowercase, underscores only. Used internally.
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Display Name</Label>
              <Input
                placeholder="e.g., Sales Lead"
                className="h-8 text-[11px]"
                value={roleFormData.display_name || ""}
                onChange={(e) =>
                  setRoleFormData((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Description (optional)</Label>
              <Textarea
                placeholder="What this role is for..."
                className="text-[11px] min-h-[60px]"
                value={roleFormData.description || ""}
                onChange={(e) =>
                  setRoleFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setIsCreateRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Permission Editor Sheet */}
      <RolePermissionEditor
        role={selectedRole}
        allPermissions={allPermissions || []}
        open={isEditRoleDialogOpen}
        onOpenChange={setIsEditRoleDialogOpen}
        onTogglePermission={handleTogglePermission}
        isLoading={
          assignPermissionMutation.isPending ||
          removePermissionMutation.isPending
        }
      />

      {/* Delete Role Dialog */}
      <Dialog
        open={isDeleteRoleDialogOpen}
        onOpenChange={setIsDeleteRoleDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-red-600">
              Delete Role
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
              Are you sure you want to delete the role{" "}
              <strong>"{selectedRole?.display_name}"</strong>?
            </p>
            <p className="text-[10px] text-zinc-500 mt-2">
              Users with this role will lose it. Make sure no users are assigned
              to this role before deleting.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setIsDeleteRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleDeleteRole}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
