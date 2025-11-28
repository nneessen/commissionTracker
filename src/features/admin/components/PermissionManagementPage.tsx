// src/features/admin/components/PermissionManagementPage.tsx

import { useState, useMemo } from 'react';
import {
  useAllPermissions,
  useAllRolesWithPermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
  type CreatePermissionInput,
  type UpdatePermissionInput,
} from '@/hooks/permissions/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Shield, Search } from 'lucide-react';
import type { Permission, PermissionScope } from '@/types/permissions.types';

export function PermissionManagementPage() {
  const { data: permissions = [], isLoading: permissionsLoading } = useAllPermissions();
  const { data: roles = [], isLoading: rolesLoading } = useAllRolesWithPermissions();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  // Form state for create/edit
  const [formData, setFormData] = useState<{
    code: string;
    resource: string;
    action: string;
    scope: PermissionScope;
    description: string;
  }>({
    code: '',
    resource: '',
    action: '',
    scope: 'all',
    description: '',
  });

  // Group permissions by resource
  const permissionsByResource = useMemo(() => {
    const filtered = permissions.filter(permission => {
      const matchesSearch =
        permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesResource = resourceFilter === 'all' || permission.resource === resourceFilter;

      return matchesSearch && matchesResource;
    });

    return filtered.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions, searchTerm, resourceFilter]);

  // Get unique resources for filter dropdown
  const uniqueResources = useMemo(() => {
    return Array.from(new Set(permissions.map(p => p.resource))).sort();
  }, [permissions]);

  // Find which roles have a given permission
  const getRolesWithPermission = (permissionId: string) => {
    return roles.filter(role =>
      role.permissions?.some(p => p.id === permissionId)
    );
  };

  const handleOpenCreateDialog = () => {
    setFormData({
      code: '',
      resource: '',
      action: '',
      scope: 'all',
      description: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormData({
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      scope: permission.scope,
      description: permission.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    try {
      await createPermission.mutateAsync(formData as CreatePermissionInput);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPermission) return;

    try {
      const updateInput: UpdatePermissionInput = {
        resource: formData.resource,
        action: formData.action,
        scope: formData.scope,
        description: formData.description,
      };
      await updatePermission.mutateAsync({
        permissionId: selectedPermission.id,
        input: updateInput,
      });
      setIsEditDialogOpen(false);
      setSelectedPermission(null);
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedPermission) return;

    try {
      await deletePermission.mutateAsync(selectedPermission.id);
      setIsDeleteDialogOpen(false);
      setSelectedPermission(null);
    } catch (error) {
      console.error('Failed to delete permission:', error);
    }
  };

  if (permissionsLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage custom permissions for your organization
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Permission
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions by code, resource, action, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map(resource => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Permissions by Resource */}
      <div className="space-y-4">
        {Object.entries(permissionsByResource).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No permissions found matching your filters
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
            <Card key={resource}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {resource}
                  <Badge variant="secondary">{resourcePermissions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resourcePermissions.map(permission => {
                    const assignedRoles = getRolesWithPermission(permission.id);
                    const isSystemPermission = permission.is_system_permission;

                    return (
                      <div
                        key={permission.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {permission.code}
                            </code>
                            <Badge variant="outline">{permission.action}</Badge>
                            <Badge variant="outline">{permission.scope}</Badge>
                            {isSystemPermission && (
                              <Badge variant="secondary">System</Badge>
                            )}
                          </div>
                          {permission.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {permission.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              Used by {assignedRoles.length} role(s):
                            </span>
                            {assignedRoles.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">None</span>
                            ) : (
                              assignedRoles.map(role => (
                                <Badge key={role.id} variant="outline" className="text-xs">
                                  {role.display_name || role.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(permission)}
                            disabled={isSystemPermission}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteDialog(permission)}
                            disabled={isSystemPermission || assignedRoles.length > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Permission Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Permission</DialogTitle>
            <DialogDescription>
              Create a new custom permission. Permission code must be unique and follow the format: resource:action
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-code">Permission Code *</Label>
              <Input
                id="create-code"
                placeholder="e.g., policies:create"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: resource:action (e.g., policies:create, users:read)
              </p>
            </div>
            <div>
              <Label htmlFor="create-resource">Resource *</Label>
              <Input
                id="create-resource"
                placeholder="e.g., policies, users, commissions"
                value={formData.resource}
                onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-action">Action *</Label>
              <Input
                id="create-action"
                placeholder="e.g., create, read, update, delete"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-scope">Scope *</Label>
              <Select
                value={formData.scope}
                onValueChange={(value) =>
                  setFormData({ ...formData, scope: value as PermissionScope })
                }
              >
                <SelectTrigger id="create-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="downline">Downline</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Describe what this permission allows..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.code || !formData.resource || !formData.action || createPermission.isPending}
            >
              {createPermission.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update permission details. Permission code cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-code">Permission Code (Read-only)</Label>
              <Input
                id="edit-code"
                value={formData.code}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit-resource">Resource *</Label>
              <Input
                id="edit-resource"
                placeholder="e.g., policies, users, commissions"
                value={formData.resource}
                onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-action">Action *</Label>
              <Input
                id="edit-action"
                placeholder="e.g., create, read, update, delete"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-scope">Scope *</Label>
              <Select
                value={formData.scope}
                onValueChange={(value) =>
                  setFormData({ ...formData, scope: value as PermissionScope })
                }
              >
                <SelectTrigger id="edit-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="downline">Downline</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what this permission allows..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.resource || !formData.action || updatePermission.isPending}
            >
              {updatePermission.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permission Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this permission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedPermission && (
            <div className="py-4">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {selectedPermission.code}
              </code>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedPermission.description}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePermission.isPending}
            >
              {deletePermission.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
