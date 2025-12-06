// src/features/admin/components/EditUserDialog.tsx
// Comprehensive user edit dialog with full CRUD capabilities

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAllRolesWithPermissions } from "@/hooks/permissions/usePermissions";
import { useAllUsers } from "@/hooks/admin/useUserApproval";
import { userApprovalService, VALID_CONTRACT_LEVELS } from "@/services/admin/userApprovalService";
import { supabase } from "@/services/base/supabase";
import showToast from "@/utils/toast";
import {
  Mail, User, Phone, Users, Trash2, Send,
  MapPin, CreditCard, Globe, AlertTriangle
} from "lucide-react";
import type { RoleName } from "@/types/permissions.types";
import type { UserProfile } from "@/services/admin/userApprovalService";

interface EditUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

interface EditableUserData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  upline_id: string | null;
  roles: RoleName[];
  approval_status: "pending" | "approved" | "denied";
  contract_level: number | null;
  // Address fields
  street_address: string;
  city: string;
  state: string;
  zip: string;
  resident_state: string;
  // License fields
  license_number: string;
  npn: string;
  license_expiration: string;
  // Social
  linkedin_url: string;
  instagram_url: string;
}

export default function EditUserDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const { data: roles } = useAllRolesWithPermissions();
  const { data: allUsers } = useAllUsers();

  const [formData, setFormData] = useState<EditableUserData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    upline_id: null,
    roles: [],
    approval_status: "pending",
    contract_level: null,
    street_address: "",
    city: "",
    state: "",
    zip: "",
    resident_state: "",
    license_number: "",
    npn: "",
    license_expiration: "",
    linkedin_url: "",
    instagram_url: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Populate form when user changes
  useEffect(() => {
    if (user && open) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        upline_id: user.upline_id || null,
        roles: (user.roles as RoleName[]) || [],
        approval_status: user.approval_status || "pending",
        contract_level: user.contract_level || null,
        street_address: (user as any).street_address || "",
        city: (user as any).city || "",
        state: (user as any).state || "",
        zip: (user as any).zip || "",
        resident_state: (user as any).resident_state || "",
        license_number: (user as any).license_number || "",
        npn: (user as any).npn || "",
        license_expiration: (user as any).license_expiration || "",
        linkedin_url: user.linkedin_url || "",
        instagram_url: user.instagram_url || "",
      });
    }
  }, [user, open]);

  const handleRoleToggle = (roleName: RoleName) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const updates: Record<string, any> = {};

      if (formData.first_name !== (user.first_name || "")) updates.first_name = formData.first_name || null;
      if (formData.last_name !== (user.last_name || "")) updates.last_name = formData.last_name || null;
      if (formData.phone !== (user.phone || "")) updates.phone = formData.phone || null;
      if (formData.upline_id !== user.upline_id) updates.upline_id = formData.upline_id;
      if (JSON.stringify(formData.roles) !== JSON.stringify(user.roles || [])) updates.roles = formData.roles;
      if (formData.approval_status !== user.approval_status) updates.approval_status = formData.approval_status;
      if (formData.contract_level !== user.contract_level) updates.contract_level = formData.contract_level;

      // Address fields
      if (formData.street_address !== ((user as any).street_address || "")) updates.street_address = formData.street_address || null;
      if (formData.city !== ((user as any).city || "")) updates.city = formData.city || null;
      if (formData.state !== ((user as any).state || "")) updates.state = formData.state || null;
      if (formData.zip !== ((user as any).zip || "")) updates.zip = formData.zip || null;
      if (formData.resident_state !== ((user as any).resident_state || "")) updates.resident_state = formData.resident_state || null;

      // License fields
      if (formData.license_number !== ((user as any).license_number || "")) updates.license_number = formData.license_number || null;
      if (formData.npn !== ((user as any).npn || "")) updates.npn = formData.npn || null;
      if (formData.license_expiration !== ((user as any).license_expiration || "")) updates.license_expiration = formData.license_expiration || null;

      // Social fields
      if (formData.linkedin_url !== (user.linkedin_url || "")) updates.linkedin_url = formData.linkedin_url || null;
      if (formData.instagram_url !== (user.instagram_url || "")) updates.instagram_url = formData.instagram_url || null;

      if (Object.keys(updates).length === 0) {
        showToast.success("No changes to save");
        setIsSaving(false);
        return;
      }

      const result = await userApprovalService.updateUser(user.id, updates);

      if (result.success) {
        showToast.success("User updated successfully");
        queryClient.invalidateQueries({ queryKey: ["userApproval"] });
        onOpenChange(false);
      } else {
        showToast.error(result.error || "Failed to update user");
      }
    } catch (error) {
      showToast.error("An error occurred while saving");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      const result = await userApprovalService.deleteUser(user.id);

      if (result.success) {
        showToast.success("User deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["userApproval"] });
        setShowDeleteConfirm(false);
        onOpenChange(false);
        onDeleted?.();
      } else {
        showToast.error(result.error || "Failed to delete user");
      }
    } catch (error) {
      showToast.error("An error occurred while deleting");
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendInvite = async () => {
    if (!user) return;
    setIsSendingInvite(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
          },
        },
      });

      if (error) {
        showToast.error(`Failed to send invite: ${error.message}`);
      } else {
        showToast.success(`Invite email sent to ${user.email}`);
      }
    } catch (error) {
      showToast.error("An error occurred while sending invite");
      console.error("Resend invite error:", error);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const approvedUplines = allUsers?.filter(
    (u) => u.approval_status === "approved" && u.id !== user?.id
  ) ?? [];

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Edit User
            </DialogTitle>
            <DialogDescription className="text-xs">
              {user.email} - Created {new Date(user.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
              <TabsTrigger value="roles" className="text-xs">Roles & Status</TabsTrigger>
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-3 mt-3">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">First Name</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Last Name</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={formData.email}
                      disabled
                      className="h-8 text-xs pl-7 bg-muted"
                      title="Email cannot be changed"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Email cannot be changed</p>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="h-8 text-xs pl-7"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Upline & Contract Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Upline</Label>
                  <Select
                    value={formData.upline_id || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, upline_id: value === "none" ? null : value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="No upline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">No upline</SelectItem>
                      {approvedUplines.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Contract Level</Label>
                  <Select
                    value={formData.contract_level?.toString() || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        contract_level: value === "none" ? null : parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Not set</SelectItem>
                      {VALID_CONTRACT_LEVELS.map((level) => (
                        <SelectItem key={level} value={level.toString()} className="text-xs">
                          {level}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Roles & Status Tab */}
            <TabsContent value="roles" className="space-y-3 mt-3">
              {/* Approval Status */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Approval Status</Label>
                <Select
                  value={formData.approval_status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, approval_status: value as "pending" | "approved" | "denied" }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="denied" className="text-xs">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Roles */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Roles</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {roles?.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center gap-2 p-2 bg-muted/20 rounded hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.roles.includes(role.name as RoleName)}
                        onCheckedChange={() => handleRoleToggle(role.name as RoleName)}
                        className="h-3.5 w-3.5"
                      />
                      <Label
                        htmlFor={`role-${role.id}`}
                        className="cursor-pointer text-xs font-normal flex-1"
                        title={role.description ?? undefined}
                      >
                        {role.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-3 mt-3">
              {/* Address Section */}
              <div>
                <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Address
                </Label>
                <div className="space-y-2 mt-1">
                  <Input
                    value={formData.street_address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, street_address: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="Street address"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="City"
                    />
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="State"
                    />
                    <Input
                      value={formData.zip}
                      onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="ZIP"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Resident State (for licensing)</Label>
                    <Input
                      value={formData.resident_state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, resident_state: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="Resident state"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* License Section */}
              <div>
                <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> License Information
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">License #</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, license_number: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="License number"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">NPN</Label>
                    <Input
                      value={formData.npn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, npn: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder="NPN"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Expiration</Label>
                    <Input
                      type="date"
                      value={formData.license_expiration}
                      onChange={(e) => setFormData((prev) => ({ ...prev, license_expiration: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Social Section */}
              <div>
                <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Social & Web
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="LinkedIn URL"
                  />
                  <Input
                    value={formData.instagram_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder="Instagram URL"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-3 mt-3">
              {/* Resend Invite */}
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Resend Invite Email</p>
                    <p className="text-xs text-muted-foreground">
                      Send a new login link to {user.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendInvite}
                    disabled={isSendingInvite}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {isSendingInvite ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </div>

              {/* User Info */}
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1">
                <p><span className="text-muted-foreground">User ID:</span> {user.id}</p>
                <p><span className="text-muted-foreground">Created:</span> {new Date(user.created_at).toLocaleString()}</p>
                <p><span className="text-muted-foreground">Updated:</span> {new Date(user.updated_at).toLocaleString()}</p>
                {(user as any).onboarding_status && (
                  <p><span className="text-muted-foreground">Onboarding:</span> {(user as any).onboarding_status}</p>
                )}
              </div>

              <Separator />

              {/* Danger Zone */}
              <Alert variant="destructive" className="border-destructive/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete User</p>
                      <p className="text-xs opacity-80">
                        This will soft-delete the user. They can be restored later.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="h-8"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{user?.email}</strong>?
              <br /><br />
              This will soft-delete the user. Their data will be preserved and they can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
