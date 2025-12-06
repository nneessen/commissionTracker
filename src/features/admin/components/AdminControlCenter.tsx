// src/features/admin/components/AdminControlCenter.tsx
import { useState } from "react";
import {
  Users, Shield, Settings, Search, Plus, Edit, Trash2,
  CheckCircle2, XCircle, UserCog, ScrollText, UserPlus,
  ChevronLeft, ChevronRight, GraduationCap
} from "lucide-react";
import { useAllUsers } from "@/hooks/admin/useUserApproval";
import { useAllRolesWithPermissions, useUpdateUserRoles, useIsAdmin } from "@/hooks/permissions/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { userApprovalService } from "@/services/admin/userApprovalService";
import { useQueryClient } from "@tanstack/react-query";
import showToast from "@/utils/toast";
import AddUserDialog, { type NewUserData } from "./AddUserDialog";
import EditUserDialog from "./EditUserDialog";
import { GraduateToAgentDialog } from "./GraduateToAgentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleName } from "@/types/permissions.types";
import type { UserProfile } from "@/services/admin/userApprovalService";

export default function AdminControlCenter() {
  const [activeView, setActiveView] = useState<"users" | "recruits" | "roles" | "system">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [graduatingRecruit, setGraduatingRecruit] = useState<UserProfile | null>(null);
  const [isGraduateDialogOpen, setIsGraduateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const { user: currentUser } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const { data: roles } = useAllRolesWithPermissions();
  const { mutate: updateUserRoles } = useUpdateUserRoles();
  const queryClient = useQueryClient();

  // Check if current user can graduate recruits (Admin, Trainer, or Contracting Manager)
  const currentUserProfile = allUsers?.find(u => u.id === currentUser?.id);
  const canGraduateRecruits = currentUserProfile?.roles?.some((role: RoleName) =>
    ['admin', 'trainer', 'contracting_manager'].includes(role)
  );

  // Hierarchy-based filtering for non-admin users
  // Admin sees all users, non-admin only sees their own hierarchy
  const hierarchyFilteredUsers = isAdmin ? allUsers : allUsers?.filter((u: UserProfile) => {
    // User can see themselves
    if (u.id === currentUser?.id) return true;

    // User can see users in their downline (hierarchy_path contains their ID)
    if (u.hierarchy_path?.includes(currentUser?.id || '')) return true;

    return false;
  });

  // CRITICAL: Separate active agents from recruits based on ROLES
  // Active agents: users with 'agent' role OR admins (is_admin=true)
  // Recruits: users WITHOUT 'agent' role AND NOT admins
  // Per GraduateToAgentDialog.tsx: Graduation sets roles=['agent'] AND onboarding_status='completed'
  const activeAgents = hierarchyFilteredUsers?.filter((u: UserProfile) =>
    u.roles?.includes('agent' as RoleName) || u.is_admin === true
  );

  // Filter recruits from hierarchyFilteredUsers (users without 'agent' role and not admin)
  const recruitsInPipeline = hierarchyFilteredUsers?.filter((u: UserProfile) =>
    !u.roles?.includes('agent' as RoleName) && u.is_admin !== true
  ) || [];

  // Calculate stats based on ACTIVE AGENTS only
  const totalUsers = activeAgents?.length || 0;
  const admins = activeAgents?.filter((u: UserProfile) => u.roles?.includes("admin")).length || 0;
  const agents = activeAgents?.filter((u: UserProfile) => u.roles?.includes("agent") && !u.roles?.includes("admin")).length || 0;
  const approved = activeAgents?.length || 0; // All active agents are approved by definition
  const pending = recruitsInPipeline?.length || 0;

  // Search filtering for active agents (Users & Access tab)
  const filteredUsers = activeAgents?.filter((user: UserProfile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  // Pagination for Users & Access tab
  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Recruits (users still in recruiting pipeline) - already set above from recruiting service
  const pendingRecruits = recruitsInPipeline;

  const getRoleColor = (roleName: RoleName): string => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      agent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      upline_manager: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      trainer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      recruiter: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return colors[roleName] || "bg-gray-100 text-gray-800";
  };

  const getRoleDisplayName = (roleName: RoleName): string => {
    const role = roles?.find(r => r.name === roleName);
    return role?.display_name || roleName;
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };


  const handleAddUser = async (userData: NewUserData) => {
    const result = await userApprovalService.createUser(userData);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      setIsAddUserDialogOpen(false);

      if (result.inviteSent) {
        showToast.success(`User created! Login link sent to ${userData.email}`);
      } else if (result.error) {
        // Profile created but invite failed
        showToast.error(result.error);
      } else {
        showToast.success(`User "${userData.first_name} ${userData.last_name}" created`);
      }
    } else {
      showToast.error(result.error || "Failed to create user");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return;
    }

    const result = await userApprovalService.deleteUser(userId);
    if (result.success) {
      showToast.success(`${userName} deleted`);
      // Invalidate all user-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['userApproval'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
    } else {
      showToast.error(result.error || 'Failed to delete user');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 space-y-3">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Admin</h1>
          </div>

          {/* Inline compact stats - NO CARDS */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{totalUsers}</span>
              <span className="text-muted-foreground">users</span>
            </div>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-red-500" />
              <span className="font-medium">{admins}</span>
              <span className="text-muted-foreground">admins</span>
            </div>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium">{agents}</span>
              <span className="text-muted-foreground">agents</span>
            </div>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="font-medium">{approved}</span>
            </div>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-yellow-500" />
              <span className="font-medium">{pending}</span>
              <span className="text-muted-foreground">pending</span>
            </div>
          </div>
        </div>

        {/* Actions moved to tab-specific headers */}
      </div>

      {/* Compact tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
        <button
          onClick={() => setActiveView("users")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all ${
            activeView === "users"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Users & Access
        </button>
        <button
          onClick={() => setActiveView("recruits")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all ${
            activeView === "recruits"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
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
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all ${
            activeView === "roles"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveView("system")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all ${
            activeView === "system"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          System Settings
        </button>
      </div>

      {/* Content area - fills remaining height */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === "users" && (
          <div className="flex flex-col h-full space-y-2">
            {/* Compact controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Show</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="h-7 w-16 text-xs">
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
              <Button size="sm" onClick={() => setIsAddUserDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add User
              </Button>
            </div>

            {/* Data table - ultra compact for hundreds of users */}
            <div className="flex-1 overflow-auto rounded-lg shadow-sm bg-background border">
              {usersLoading ? (
                <div className="p-3 space-y-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="bg-muted/50 border-b">
                      <TableHead className="h-8 text-[11px] font-semibold w-[200px]">User</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[140px]">Roles</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[80px]">Status</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[70px]">Level</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[90px]">Created</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[60px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers?.map((user: UserProfile) => (
                      <TableRow key={user.id} className="hover:bg-muted/30 border-b">
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
                              {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[11px] truncate leading-tight">{user.full_name || "No name"}</div>
                              <div className="text-[10px] text-muted-foreground truncate leading-tight">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {user.roles?.slice(0, 2).map((roleName) => (
                              <Badge
                                key={roleName}
                                className={`${getRoleColor(roleName)} text-[10px] px-1 py-0 h-4`}
                                variant="secondary"
                              >
                                {getRoleDisplayName(roleName)}
                              </Badge>
                            ))}
                            {(user.roles?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                +{(user.roles?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          {user.approval_status === "approved" ? (
                            <Badge variant="outline" className="text-green-600 text-[10px] h-4 px-1">
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 text-[10px] h-4 px-1">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[11px]">{user.contract_level || "-"}%</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px]"
                              onClick={() => handleEditUser(user)}
                              title="Edit user"
                            >
                              <Edit className="h-2.5 w-2.5 mr-0.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
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
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
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
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers?.length || 0)} of {filteredUsers?.length || 0} users
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and pages around current
                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, idx, arr) => (
                        <>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-1 text-muted-foreground">...</span>
                          )}
                          <Button
                            key={page}
                            size="sm"
                            variant={currentPage === page ? "default" : "ghost"}
                            className="h-7 w-7 p-0 text-xs"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </>
                      ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{pending}</span>
                  <span className="text-muted-foreground">pending recruits</span>
                </div>
              </div>
            </div>

            {/* Recruits table - ultra compact */}
            <div className="flex-1 overflow-auto rounded-lg shadow-sm bg-background border">
              {usersLoading ? (
                <div className="p-3 space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="bg-muted/50 border-b">
                      <TableHead className="h-8 text-[11px] font-semibold w-[180px]">Recruit</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[130px]">Upline</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[100px]">Resident State</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[90px]">Applied</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[100px]">Phase</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRecruits?.map((recruit: any) => {
                      // Get full names from nested objects if available
                      const recruitName = recruit.first_name && recruit.last_name
                        ? `${recruit.first_name} ${recruit.last_name}`
                        : recruit.email;

                      const uplineName = recruit.upline
                        ? (recruit.upline.first_name && recruit.upline.last_name
                            ? `${recruit.upline.first_name} ${recruit.upline.last_name}`
                            : recruit.upline.email)
                        : null;

                      // Get the current phase - this should be from current_onboarding_phase
                      const currentPhase = recruit.current_onboarding_phase || recruit.onboarding_status || 'Not Started';

                      return (
                        <TableRow key={recruit.id} className="hover:bg-muted/30 border-b">
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-yellow-100 flex items-center justify-center text-[10px] font-semibold shrink-0">
                                {recruitName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-[11px] truncate leading-tight">{recruitName}</div>
                                <div className="text-[10px] text-muted-foreground truncate leading-tight">{recruit.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5">
                            {uplineName ? (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {uplineName}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {recruit.resident_state || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {recruit.created_at ? new Date(recruit.created_at).toLocaleDateString() : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className="text-blue-600 text-[10px] h-4 px-1">
                              {currentPhase.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px]"
                                onClick={() => handleEditUser(recruit)}
                                title="View/Edit full profile"
                              >
                                <Edit className="h-2.5 w-2.5 mr-0.5" />
                                Edit
                              </Button>
                              {/* Show Graduate button only if:
                                  1. User has permission (Admin, Trainer, or Contracting Manager)
                                  2. Recruit is in bootcamp phase or later
                              */}
                              {canGraduateRecruits && ['bootcamp', 'npn_received', 'contracting'].includes(recruit.current_onboarding_phase || '') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1.5 text-[10px] text-green-600 hover:text-green-700"
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
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
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
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{roles?.length || 0}</span>
                  <span className="text-muted-foreground">total roles</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-lg shadow-sm bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px]">Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Permissions</TableHead>
                    <TableHead className="w-[100px]">Users</TableHead>
                    <TableHead className="w-[120px]">System Role</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles?.map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-sm">{role.display_name}</div>
                        <div className="text-xs text-muted-foreground">{role.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground truncate max-w-md">
                          {role.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{role.permissions?.length || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {activeAgents?.filter((u: any) => u.roles?.includes(role.name as RoleName)).length || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {role.is_system_role && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 px-2">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeView === "system" && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">System Settings view - Coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Dialog - Comprehensive */}
      <EditUserDialog
        user={editingUser}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['recruits'] });
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
    </div>
  );
}
