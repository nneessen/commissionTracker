// src/features/admin/components/RoleManagementPage.tsx
// COMPLETE implementation with ALL CRUD dialogs

import React, { useState } from 'react';
import {useAllRoles, useAllPermissions, useCreateRole, useUpdateRole, useDeleteRole, useRolePermissionsWithInheritance, useAssignPermissionToRole, useRemovePermissionFromRole} from '@/hooks/permissions/usePermissions';
import type {Role, Permission} from '@/types/permissions.types';
import type {CreateRoleInput, UpdateRoleInput} from '@/services/permissions/permissionService';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Skeleton} from '@/components/ui/skeleton';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Shield, Plus, Edit, Trash2, Lock, ChevronDown, ChevronRight} from 'lucide-react';

export function RoleManagementPage() {
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useAllRoles();
  const { data: permissions } = useAllPermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [formData, setFormData] = useState<Partial<CreateRoleInput & UpdateRoleInput>>({
    name: '',
    display_name: '',
    description: '',
    parent_role_id: null,
    respects_hierarchy: true,
  });

  const toggleRole = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const openCreateDialog = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      parent_role_id: null,
      respects_hierarchy: true,
    });
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      display_name: role.display_name,
      description: role.description || '',
      parent_role_id: role.parent_role_id,
      respects_hierarchy: role.respects_hierarchy,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const openPermissionsDialog = (role: Role) => {
    setSelectedRole(role);
    setIsPermissionsDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.display_name) {
      alert('Name and Display Name are required');
      return;
    }

    try {
      await createRole.mutateAsync(formData as CreateRoleInput);
      setIsCreateDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create role');
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole || !formData.display_name) {
      alert('Display Name is required');
      return;
    }

    try {
      await updateRole.mutateAsync({
        roleId: selectedRole.id,
        input: formData as UpdateRoleInput,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;

    try {
      await deleteRole.mutateAsync(selectedRole.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete role');
    }
  };

  if (rolesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load roles: {rolesError instanceof Error ? rolesError.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">Create and manage system roles</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.filter((r) => r.is_system_role).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.filter((r) => !r.is_system_role).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3">
        {roles?.map((role) => (
          <Card key={role.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleRole(role.id)}
                  >
                    {expandedRoles.has(role.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{role.display_name}</span>
                      <Badge variant="outline">{role.name}</Badge>
                      {role.is_system_role && (
                        <Badge variant="secondary">
                          <Lock className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPermissionsDialog(role)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Permissions
                  </Button>
                  {!role.is_system_role && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openDeleteDialog(role)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Create a custom role with specific permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name (snake_case) *</Label>
              <Input
                id="name"
                placeholder="regional_manager"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                placeholder="Regional Manager"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this role do?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_role">Parent Role</Label>
              <Select
                value={formData.parent_role_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_role_id: value === 'none' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent role</SelectItem>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="respects_hierarchy"
                checked={formData.respects_hierarchy}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, respects_hierarchy: checked as boolean })
                }
              />
              <Label htmlFor="respects_hierarchy" className="cursor-pointer">
                Respects upline/downline hierarchy
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRole.isPending}>
              {createRole.isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Editing: {selectedRole?.display_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Display Name *</Label>
              <Input
                id="edit_display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_parent_role">Parent Role</Label>
              <Select
                value={formData.parent_role_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_role_id: value === 'none' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent role</SelectItem>
                  {roles?.filter((r) => r.id !== selectedRole?.id).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_respects_hierarchy"
                checked={formData.respects_hierarchy}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, respects_hierarchy: checked as boolean })
                }
              />
              <Label htmlFor="edit_respects_hierarchy" className="cursor-pointer">
                Respects upline/downline hierarchy
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateRole.isPending}>
              {updateRole.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRole?.display_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRole.isPending}>
              {deleteRole.isPending ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      {selectedRole && (
        <PermissionsEditorDialog
          role={selectedRole}
          open={isPermissionsDialogOpen}
          onOpenChange={setIsPermissionsDialogOpen}
          allPermissions={permissions || []}
        />
      )}
    </div>
  );
}

// Permissions Editor Dialog Component
interface PermissionsEditorDialogProps {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPermissions: Permission[];
}

function PermissionsEditorDialog({
  role,
  open,
  onOpenChange,
  allPermissions,
}: PermissionsEditorDialogProps) {
  const { data: rolePermissions, isLoading } = useRolePermissionsWithInheritance(
    open ? role.id : undefined
  );
  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = async (permissionId: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        await removePermission.mutateAsync({ roleId: role.id, permissionId });
      } else {
        await assignPermission.mutateAsync({ roleId: role.id, permissionId });
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to toggle permission');
    }
  };

  const directPermissions = new Set(
    rolePermissions?.filter((p) => p.permissionType === 'direct').map((p) => p.id) || []
  );

  const inheritedPermissions = new Set(
    rolePermissions?.filter((p) => p.permissionType === 'inherited').map((p) => p.id) || []
  );

  const filteredPermissions = allPermissions?.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.code.toLowerCase().includes(query) ||
      p.resource.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Permissions for {role.display_name}
            {role.is_system_role && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Read Only
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage permissions assigned to this role
            {role.parent_role_id && '. Inherited permissions are shown in gray.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredPermissions?.map((permission) => {
                const isDirect = directPermissions.has(permission.id);
                const isInherited = inheritedPermissions.has(permission.id);
                const hasPermission = isDirect || isInherited;

                return (
                  <div
                    key={permission.id}
                    className={`flex items-start space-x-3 p-3 border rounded-lg ${
                      isInherited ? 'bg-muted/50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={hasPermission}
                      disabled={role.is_system_role || isInherited}
                      onCheckedChange={() => handleToggle(permission.id, isDirect)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{permission.code}</span>
                        {isInherited && (
                          <Badge variant="outline" className="text-xs">
                            Inherited
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {permission.description || `${permission.action} ${permission.resource}`}
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {permission.resource}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {permission.action}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {permission.scope}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
