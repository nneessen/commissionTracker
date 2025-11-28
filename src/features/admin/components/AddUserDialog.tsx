// src/features/admin/components/AddUserDialog.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllRolesWithPermissions } from "@/hooks/permissions/usePermissions";
import { useAllUsers } from "@/hooks/admin/useUserApproval";
import type { RoleName } from "@/types/permissions.types";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userData: NewUserData) => void;
}

export interface NewUserData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password?: string; // Optional - if empty, sends invite email
  upline_id?: string | null;
  roles: RoleName[];
  approval_status: 'pending' | 'approved';
  onboarding_status?: 'lead' | 'active' | null;
}

export default function AddUserDialog({ open, onOpenChange, onSave }: AddUserDialogProps) {
  const { data: roles } = useAllRolesWithPermissions();
  const { data: allUsers } = useAllUsers();

  const [formData, setFormData] = useState<NewUserData>({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    upline_id: null,
    roles: [],
    approval_status: "approved",
    onboarding_status: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";

    if (formData.roles.length === 0) {
      newErrors.roles = "At least one role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    onSave(formData);
    handleReset();
  };

  const handleReset = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      password: "",
      upline_id: null,
      roles: [],
      approval_status: "approved",
      onboarding_status: null,
    });
    setErrors({});
  };

  const handleRoleToggle = (roleName: RoleName) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter(r => r !== roleName)
        : [...prev.roles, roleName]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. Leave password empty to send an email invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave empty to send invite"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className={errors.first_name ? "border-red-500" : ""}
              />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className={errors.last_name ? "border-red-500" : ""}
              />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          {/* Hierarchy */}
          <div className="space-y-2">
            <Label htmlFor="upline">Upline (optional)</Label>
            <Select
              value={formData.upline_id || "none"}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                upline_id: value === "none" ? null : value
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select upline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No upline</SelectItem>
                {allUsers?.filter(u => u.approval_status === 'approved').map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>Roles * {errors.roles && <span className="text-xs text-red-500 ml-2">{errors.roles}</span>}</Label>
            <div className="space-y-2 border rounded-md p-3">
              {roles?.map(role => (
                <div key={role.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`role-${role.id}`}
                    checked={formData.roles.includes(role.name as RoleName)}
                    onChange={() => handleRoleToggle(role.name as RoleName)}
                    className="mt-1"
                  />
                  <label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium text-sm">{role.display_name}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="approval_status">Approval Status</Label>
              <Select
                value={formData.approval_status}
                onValueChange={(value: 'pending' | 'approved') =>
                  setFormData(prev => ({ ...prev, approval_status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved (Active Agent)</SelectItem>
                  <SelectItem value="pending">Pending (Recruit)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.approval_status === 'approved'
                  ? 'User will appear in Users & Access tab'
                  : 'User will appear in Recruiting Pipeline tab'}
              </p>
            </div>

            {formData.approval_status === 'pending' && (
              <div className="space-y-2">
                <Label htmlFor="onboarding_status">Onboarding Status</Label>
                <Select
                  value={formData.onboarding_status || "none"}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      onboarding_status: value === "none" ? null : (value as 'lead' | 'active')
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {formData.password ? "Create User" : "Create & Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
