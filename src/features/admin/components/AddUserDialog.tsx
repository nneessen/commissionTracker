// src/features/admin/components/AddUserDialog.tsx
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {useAllRolesWithPermissions} from "@/hooks/permissions/usePermissions";
import {useAllUsers} from "@/hooks/admin/useUserApproval";
import {Mail, User, Phone, Users} from "lucide-react";
import type {RoleName} from "@/types/permissions.types";

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
  upline_id?: string | null;
  roles: RoleName[];
  approval_status: "pending" | "approved";
  onboarding_status?: "lead" | "active" | null;
}

const INITIAL_FORM_DATA: NewUserData = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  upline_id: null,
  roles: [],
  approval_status: "approved",
  onboarding_status: null,
};

export default function AddUserDialog({
  open,
  onOpenChange,
  onSave,
}: AddUserDialogProps) {
  const { data: roles } = useAllRolesWithPermissions();
  const { data: allUsers } = useAllUsers();

  const [formData, setFormData] = useState<NewUserData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    if (!formData.first_name) newErrors.first_name = "Required";
    if (!formData.last_name) newErrors.last_name = "Required";
    if (formData.roles.length === 0) newErrors.roles = "Select at least one";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    onSave(formData);
    handleReset();
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
  };

  const handleRoleToggle = (roleName: RoleName) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName],
    }));
  };

  const approvedUplines =
    allUsers?.filter((u) => u.approval_status === "approved") ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleReset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-semibold">
            Add New User
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            A login link will be emailed to the user automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Email */}
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className={`h-7 text-xs pl-7 ${errors.email ? "border-destructive" : ""}`}
                placeholder="user@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-destructive mt-0.5">
                {errors.email}
              </p>
            )}
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">
                First Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                <Input
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  className={`h-7 text-xs pl-7 ${errors.first_name ? "border-destructive" : ""}`}
                  placeholder="First"
                />
              </div>
              {errors.first_name && (
                <p className="text-[10px] text-destructive mt-0.5">
                  {errors.first_name}
                </p>
              )}
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                className={`h-7 text-xs ${errors.last_name ? "border-destructive" : ""}`}
                placeholder="Last"
              />
              {errors.last_name && (
                <p className="text-[10px] text-destructive mt-0.5">
                  {errors.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Phone & Upline */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="h-7 text-xs pl-7"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">
                Upline
              </Label>
              <div className="relative">
                <Users className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground z-10" />
                <Select
                  value={formData.upline_id || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      upline_id: value === "none" ? null : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs pl-7">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      No upline
                    </SelectItem>
                    {approvedUplines.map((user) => (
                      <SelectItem
                        key={user.id}
                        value={user.id}
                        className="text-xs"
                      >
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Roles - Compact Inline Checkboxes */}
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Roles <span className="text-destructive">*</span>
              {errors.roles && (
                <span className="text-destructive ml-1">({errors.roles})</span>
              )}
            </Label>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 bg-muted/30 p-2 rounded">
              {roles?.map((role) => (
                <div key={role.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={formData.roles.includes(role.name as RoleName)}
                    onCheckedChange={() =>
                      handleRoleToggle(role.name as RoleName)
                    }
                    className="h-3 w-3"
                  />
                  <Label
                    htmlFor={`role-${role.id}`}
                    className="cursor-pointer text-[11px] font-normal"
                    title={role.description ?? undefined}
                  >
                    {role.display_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Toggle Buttons */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Status</Label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <Button
                type="button"
                variant={
                  formData.approval_status === "approved"
                    ? "default"
                    : "outline"
                }
                size="sm"
                className="h-7 text-[10px]"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    approval_status: "approved",
                    onboarding_status: null,
                  }))
                }
              >
                Approved (Agent)
              </Button>
              <Button
                type="button"
                variant={
                  formData.approval_status === "pending" ? "default" : "outline"
                }
                size="sm"
                className="h-7 text-[10px]"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    approval_status: "pending",
                  }))
                }
              >
                Pending (Recruit)
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formData.approval_status === "approved"
                ? "User appears in Users & Access"
                : "User appears in Recruiting Pipeline"}
            </p>
          </div>

          {/* Onboarding Status - Only when Pending */}
          {formData.approval_status === "pending" && (
            <div className="bg-muted/30 p-2 rounded">
              <Label className="text-[10px] text-muted-foreground">
                Onboarding Status
              </Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                <Button
                  type="button"
                  variant={
                    formData.onboarding_status === null ? "default" : "outline"
                  }
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      onboarding_status: null,
                    }))
                  }
                >
                  Not set
                </Button>
                <Button
                  type="button"
                  variant={
                    formData.onboarding_status === "lead"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      onboarding_status: "lead",
                    }))
                  }
                >
                  Lead
                </Button>
                <Button
                  type="button"
                  variant={
                    formData.onboarding_status === "active"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      onboarding_status: "active",
                    }))
                  }
                >
                  Active
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-1 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-7 px-3 text-xs"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm" className="h-7 px-3 text-xs">
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
