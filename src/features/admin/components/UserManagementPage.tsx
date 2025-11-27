// src/features/admin/components/UserManagementPage.tsx

import React, { useState } from 'react';
import { useAllUsers } from '@/hooks/admin/useUserApproval';
import { useAllRoles, useUpdateUserRoles } from '@/hooks/permissions/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, Shield, Search, UserCog, CheckCircle2, XCircle } from 'lucide-react';
import type { RoleName } from '@/types/permissions.types';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  roles: RoleName[];
  created_at: string;
  is_approved?: boolean;
}

export function UserManagementPage() {
  const { data: users, isLoading: usersLoading, error: usersError } = useAllUsers();
  const { data: roles, isLoading: rolesLoading } = useAllRoles();
  const updateUserRoles = useUpdateUserRoles();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<RoleName>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedRoles(new Set(user.roles || []));
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setSelectedUser(null);
    setSelectedRoles(new Set());
    setIsEditDialogOpen(false);
  };

  const handleRoleToggle = (roleName: RoleName) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(roleName)) {
      newRoles.delete(roleName);
    } else {
      newRoles.add(roleName);
    }
    setSelectedRoles(newRoles);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    const rolesArray = Array.from(selectedRoles);

    await updateUserRoles.mutateAsync({
      userId: selectedUser.id,
      roles: rolesArray.length > 0 ? rolesArray : ['agent'], // Ensure at least 'agent' role
    });

    closeEditDialog();
  };

  // Filter users based on search query
  const filteredUsers = users?.filter((user: UserProfile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  const getRoleColor = (roleName: RoleName): string => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      upline_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      trainer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      recruiter: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      contracting_manager: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      office_staff: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      view_only: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800';
  };

  const getRoleDisplayName = (roleName: RoleName): string => {
    const role = roles?.find(r => r.name === roleName);
    return role?.display_name || roleName;
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load users: {usersError instanceof Error ? usersError.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user roles and permissions
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {users?.filter((u: UserProfile) => u.is_approved).length || 0} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: UserProfile) => u.roles?.includes('admin')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Full system access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: UserProfile) => u.roles?.includes('agent') && !u.roles?.includes('admin')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active sales agents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Users</h2>

        <div className="grid gap-3">
          {filteredUsers?.map((user: UserProfile) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.full_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap ml-13">
                      {user.roles?.map((roleName) => (
                        <Badge
                          key={roleName}
                          className={getRoleColor(roleName)}
                          variant="secondary"
                        >
                          {getRoleDisplayName(roleName)}
                        </Badge>
                      ))}
                      {(!user.roles || user.roles.length === 0) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          No roles assigned
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.is_approved ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Edit Roles
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No users found matching "{searchQuery}"
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Roles Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Roles</DialogTitle>
            <DialogDescription>
              Assign roles to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {roles?.map((role) => (
              <div key={role.id} className="flex items-start space-x-3 space-y-0">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoles.has(role.name)}
                  onCheckedChange={() => handleRoleToggle(role.name)}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{role.display_name}</span>
                      <Badge className={getRoleColor(role.name)} variant="secondary">
                        {role.name}
                      </Badge>
                    </div>
                  </Label>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={updateUserRoles.isPending}
            >
              {updateUserRoles.isPending ? 'Saving...' : 'Save Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
