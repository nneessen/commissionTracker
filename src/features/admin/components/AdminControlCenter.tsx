// src/features/admin/components/AdminControlCenter.tsx
import { useState } from "react";
import {
  Users, Shield, Settings, Search, Plus, Edit,
  CheckCircle2, XCircle, UserCog, ScrollText, UserPlus,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useAllUsers } from "@/hooks/admin/useUserApproval";
import { useAllRolesWithPermissions, useUpdateUserRoles, useIsAdmin } from "@/hooks/permissions/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const { user: currentUser } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const { data: roles } = useAllRolesWithPermissions();
  const { mutate: updateUserRoles } = useUpdateUserRoles();

  // Hierarchy-based filtering for non-admin users
  // Admin sees all users, non-admin only sees their own hierarchy
  const users = isAdmin ? allUsers : allUsers?.filter((u: UserProfile) => {
    // User can see themselves
    if (u.id === currentUser?.id) return true;

    // User can see users in their downline (hierarchy_path contains their ID)
    if (u.hierarchy_path?.includes(currentUser?.id || '')) return true;

    return false;
  });

  // Calculate stats
  const totalUsers = users?.length || 0;
  const admins = users?.filter((u: UserProfile) => u.roles?.includes("admin")).length || 0;
  const agents = users?.filter((u: UserProfile) => u.roles?.includes("agent") && !u.roles?.includes("admin")).length || 0;
  const pending = users?.filter((u: UserProfile) => u.approval_status === "pending").length || 0;
  const approved = users?.filter((u: UserProfile) => u.approval_status === "approved").length || 0;

  const filteredUsers = users?.filter((user: UserProfile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Recruits (pending users)
  const pendingRecruits = users?.filter((u: UserProfile) => u.approval_status === "pending");

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

  const handleEditRoles = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSaveRoles = (selectedRoles: RoleName[]) => {
    if (!editingUser) return;
    
    updateUserRoles(
      { userId: editingUser.id, roles: selectedRoles },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingUser(null);
        },
      }
    );
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

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Invite User
          </Button>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create User
          </Button>
        </div>
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
                      <TableHead className="h-8 text-[11px] font-semibold">User</TableHead>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5"
                            onClick={() => handleEditRoles(user)}
                          >
                            <Edit className="h-2.5 w-2.5" />
                          </Button>
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
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Recruit
              </Button>
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
                      <TableHead className="h-8 text-[11px] font-semibold">Recruit</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[120px]">Upline</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[100px]">Applied</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[80px]">Status</TableHead>
                      <TableHead className="h-8 text-[11px] font-semibold w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRecruits?.map((recruit: UserProfile) => {
                      const upline = users?.find((u: UserProfile) => u.id === recruit.upline_id);
                      return (
                        <TableRow key={recruit.id} className="hover:bg-muted/30 border-b">
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-yellow-100 flex items-center justify-center text-[10px] font-semibold shrink-0">
                                {recruit.full_name?.charAt(0) || recruit.email?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-[11px] truncate leading-tight">{recruit.full_name || "No name"}</div>
                                <div className="text-[10px] text-muted-foreground truncate leading-tight">{recruit.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5">
                            {upline ? (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {upline.full_name || upline.email}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {recruit.created_at ? new Date(recruit.created_at).toLocaleDateString() : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className="text-yellow-600 text-[10px] h-4 px-1">
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5"
                                onClick={() => handleEditRoles(recruit)}
                              >
                                <Edit className="h-2.5 w-2.5" />
                              </Button>
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
                          {users?.filter((u: any) => u.roles?.includes(role.name as RoleName)).length || 0}
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

      {/* Edit Roles Dialog - Compact, NO nested cards */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit User Roles</DialogTitle>
            <DialogDescription className="text-sm">
              {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            {roles?.map((role) => {
              const isChecked = editingUser?.roles?.includes(role.name as RoleName);
              return (
                <div
                  key={role.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    id={`role-${role.id}`}
                    checked={isChecked}
                    onChange={(e) => {
                      if (!editingUser) return;
                      const currentRoles = editingUser.roles || [];
                      const newRoles = e.target.checked
                        ? [...currentRoles, role.name as RoleName]
                        : currentRoles.filter(r => r !== role.name);
                      setEditingUser({ ...editingUser, roles: newRoles });
                    }}
                    className="mt-1 h-4 w-4 rounded"
                  />
                  <label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium text-sm">{role.display_name}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </label>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveRoles(editingUser?.roles || [])}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
