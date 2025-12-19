// src/features/admin/components/EditUserDialog.tsx
// Redesigned with zinc palette and compact design

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
import { useAllUsers, useDeleteUser } from "@/hooks/admin/useUserApproval";
import {
  userApprovalService,
  VALID_CONTRACT_LEVELS,
} from "@/services/users/userService";
import { supabase } from "@/services/base/supabase";
import showToast from "@/utils/toast";
import {
  Mail,
  User,
  Phone,
  Users,
  Trash2,
  Send,
  MapPin,
  CreditCard,
  Globe,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { RoleName } from "@/types/permissions.types";
import type { UserProfile } from "@/services/users/userService";
import { getDisplayName } from "@/types/user.types";

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
  agent_status: "unlicensed" | "licensed" | "not_applicable" | null;
  contract_level: number | null;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  resident_state: string;
  license_number: string;
  npn: string;
  license_expiration: string;
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
  const deleteUserMutation = useDeleteUser();

  const [formData, setFormData] = useState<EditableUserData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    upline_id: null,
    roles: [],
    approval_status: "pending",
    agent_status: null,
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
  const [reassignUplineId, setReassignUplineId] = useState<string | null>(null);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [downlineCount, setDownlineCount] = useState(0);
  const [potentialUplines, setPotentialUplines] = useState<
    Array<{ id: string; first_name: string; last_name: string; email: string }>
  >([]);

  useEffect(() => {
    if (!showDeleteConfirm || !user) {
      setDownlineCount(0);
      setPotentialUplines([]);
      setReassignUplineId(null);
      setCheckingDependencies(false);
      return;
    }

    let isActive = true;

    const checkDownlines = async () => {
      setCheckingDependencies(true);
      try {
        const { count, error: countError } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("upline_id", user.id);

        if (countError) {
          console.error("Error checking downlines:", countError);
          if (isActive) setDownlineCount(0);
          return;
        }

        if (!isActive) return;
        setDownlineCount(count || 0);

        if (count && count > 0) {
          const { data: uplines, error: uplinesError } = await supabase
            .from("user_profiles")
            .select("id, first_name, last_name, email")
            .neq("id", user.id)
            .order("first_name");

          if (uplinesError) {
            console.error("Error fetching uplines:", uplinesError);
          }
          if (isActive) setPotentialUplines(uplines || []);
        }
      } catch (error) {
        console.error("Error checking downlines:", error);
        if (isActive) setDownlineCount(0);
      } finally {
        if (isActive) setCheckingDependencies(false);
      }
    };

    checkDownlines();

    return () => {
      isActive = false;
    };
  }, [showDeleteConfirm, user?.id, user]);

  useEffect(() => {
    if (user && open) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        upline_id: user.upline_id || null,
        roles: (user.roles as RoleName[]) || [],
        approval_status:
          (user.approval_status as "pending" | "approved" | "denied") ||
          "pending",
        agent_status: user.agent_status || null,
        contract_level: user.contract_level || null,
        street_address: user.street_address || "",
        city: user.city || "",
        state: user.state || "",
        zip: user.zip || "",
        resident_state: user.resident_state || "",
        license_number: user.license_number || "",
        npn: user.npn || "",
        license_expiration: user.license_expiration || "",
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
      const updates: Record<string, unknown> = {};

      if (formData.first_name !== (user.first_name || ""))
        updates.first_name = formData.first_name || null;
      if (formData.last_name !== (user.last_name || ""))
        updates.last_name = formData.last_name || null;
      if (formData.phone !== (user.phone || ""))
        updates.phone = formData.phone || null;
      if (formData.upline_id !== user.upline_id)
        updates.upline_id = formData.upline_id;
      if (JSON.stringify(formData.roles) !== JSON.stringify(user.roles || []))
        updates.roles = formData.roles;
      if (formData.approval_status !== user.approval_status)
        updates.approval_status = formData.approval_status;
      if (formData.agent_status !== user.agent_status)
        updates.agent_status = formData.agent_status;
      if (formData.contract_level !== user.contract_level)
        updates.contract_level = formData.contract_level;

      if (formData.street_address !== (user.street_address || ""))
        updates.street_address = formData.street_address || null;
      if (formData.city !== (user.city || ""))
        updates.city = formData.city || null;
      if (formData.state !== (user.state || ""))
        updates.state = formData.state || null;
      if (formData.zip !== (user.zip || "")) updates.zip = formData.zip || null;
      if (formData.resident_state !== (user.resident_state || ""))
        updates.resident_state = formData.resident_state || null;

      if (formData.license_number !== (user.license_number || ""))
        updates.license_number = formData.license_number || null;
      if (formData.npn !== (user.npn || "")) updates.npn = formData.npn || null;
      if (formData.license_expiration !== (user.license_expiration || ""))
        updates.license_expiration = formData.license_expiration || null;

      if (formData.linkedin_url !== (user.linkedin_url || ""))
        updates.linkedin_url = formData.linkedin_url || null;
      if (formData.instagram_url !== (user.instagram_url || ""))
        updates.instagram_url = formData.instagram_url || null;

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
      // Step 1: Reassign downlines if needed
      if (downlineCount > 0 && reassignUplineId) {
        const { data, error } = await supabase
          .from("user_profiles")
          .update({ upline_id: reassignUplineId })
          .eq("upline_id", user.id)
          .select();

        if (error) {
          throw new Error(error.message || "Failed to reassign downlines");
        }
        showToast.success(`Reassigned ${data?.length || 0} downline(s)`);
      }

      // Step 2: Delete user using mutation hook for proper cache invalidation
      deleteUserMutation.mutate(user.id, {
        onSuccess: (result) => {
          if (result.success) {
            showToast.success("User permanently deleted");
            // Query invalidation is handled by the mutation hook
            setShowDeleteConfirm(false);
            onOpenChange(false);
            onDeleted?.();
          } else {
            showToast.error(result.error || "Failed to delete user");
          }
          setIsDeleting(false);
        },
        onError: (error) => {
          showToast.error(
            error instanceof Error
              ? error.message
              : "An error occurred while deleting",
          );
          console.error("Delete error:", error);
          setIsDeleting(false);
        },
      });
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting",
      );
      console.error("Delete error:", error);
      setIsDeleting(false);
    }
  };

  const handleResendInvite = async () => {
    if (!user) return;
    setIsSendingInvite(true);

    try {
      // Use custom Mailgun edge function instead of Supabase's built-in email
      const { data, error: fnError } = await supabase.functions.invoke(
        "send-password-reset",
        {
          body: {
            email: user.email,
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
          },
        },
      );

      if (fnError) {
        showToast.error(
          `Failed to send confirmation email: ${fnError.message}`,
        );
      } else if (data?.success === false) {
        showToast.error(`Failed to send confirmation email: ${data.error}`);
      } else {
        showToast.success(
          `Confirmation email sent to ${user.email} to set password`,
        );
      }
    } catch (error) {
      showToast.error("An error occurred while sending confirmation email");
      console.error("Resend confirmation email error:", error);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const approvedUplines =
    allUsers?.filter(
      (u) => u.approval_status === "approved" && u.id !== user?.id,
    ) ?? [];

  if (!user) return null;

  const dialogOpen = open && !showDeleteConfirm;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-0 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <User className="h-4 w-4" />
              Edit User
            </DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {user.email} • Created{" "}
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "Unknown"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mx-4 mt-3 grid w-[calc(100%-2rem)] grid-cols-4 h-7 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded">
              <TabsTrigger
                value="basic"
                className="text-[10px] h-6 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className="text-[10px] h-6 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
              >
                Roles & Status
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="text-[10px] h-6 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="text-[10px] h-6 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
              >
                Actions
              </TabsTrigger>
            </TabsList>

            <div className="px-4 py-3">
              <TabsContent value="basic" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      First Name
                    </Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Last Name
                    </Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-2 top-1.5 h-3 w-3 text-zinc-400" />
                      <Input
                        value={formData.email}
                        disabled
                        className="h-7 text-[11px] pl-7 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        title="Email cannot be changed"
                      />
                    </div>
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      Email cannot be changed
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Phone
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-2 top-1.5 h-3 w-3 text-zinc-400" />
                      <Input
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] pl-7 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Upline
                    </Label>
                    <Select
                      value={formData.upline_id || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          upline_id: value === "none" ? null : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                        <SelectValue placeholder="No upline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[11px]">
                          No upline
                        </SelectItem>
                        {approvedUplines.map((u) => (
                          <SelectItem
                            key={u.id}
                            value={u.id}
                            className="text-[11px]"
                          >
                            {getDisplayName(u)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Contract Level
                    </Label>
                    <Select
                      value={formData.contract_level?.toString() || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          contract_level:
                            value === "none" ? null : parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[11px]">
                          Not set
                        </SelectItem>
                        {VALID_CONTRACT_LEVELS.map((level) => (
                          <SelectItem
                            key={level}
                            value={level.toString()}
                            className="text-[11px]"
                          >
                            {level}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roles" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Approval Status
                    </Label>
                    <Select
                      value={formData.approval_status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          approval_status: value as
                            | "pending"
                            | "approved"
                            | "denied",
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved" className="text-[11px]">
                          Approved
                        </SelectItem>
                        <SelectItem value="pending" className="text-[11px]">
                          Pending
                        </SelectItem>
                        <SelectItem value="denied" className="text-[11px]">
                          Denied
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Agent Status
                    </Label>
                    <Select
                      value={formData.agent_status || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          agent_status:
                            value === "none"
                              ? null
                              : (value as
                                  | "unlicensed"
                                  | "licensed"
                                  | "not_applicable"),
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[11px]">
                          Not Set
                        </SelectItem>
                        <SelectItem value="licensed" className="text-[11px]">
                          Licensed (Active)
                        </SelectItem>
                        <SelectItem value="unlicensed" className="text-[11px]">
                          Unlicensed (Training)
                        </SelectItem>
                        <SelectItem
                          value="not_applicable"
                          className="text-[11px]"
                        >
                          Not Applicable
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
                  <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1.5 block">
                    Roles
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {roles?.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-1.5 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={formData.roles.includes(
                            role.name as RoleName,
                          )}
                          onCheckedChange={() =>
                            handleRoleToggle(role.name as RoleName)
                          }
                          className="h-3 w-3"
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="cursor-pointer text-[10px] font-normal text-zinc-700 dark:text-zinc-300 flex-1"
                          title={role.description ?? undefined}
                        >
                          {role.display_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-3 mt-0">
                <div>
                  <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-1">
                    <MapPin className="h-2.5 w-2.5" /> Address
                  </Label>
                  <div className="space-y-1.5">
                    <Input
                      value={formData.street_address}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          street_address: e.target.value,
                        }))
                      }
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      placeholder="Street address"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <Input
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="City"
                      />
                      <Input
                        value={formData.state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            state: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="State"
                      />
                      <Input
                        value={formData.zip}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            zip: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="ZIP"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-zinc-400">
                        Resident State (licensing)
                      </Label>
                      <Input
                        value={formData.resident_state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            resident_state: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="Resident state"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
                  <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-1">
                    <CreditCard className="h-2.5 w-2.5" /> License Information
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <Label className="text-[9px] text-zinc-400">
                        License #
                      </Label>
                      <Input
                        value={formData.license_number}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            license_number: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="License number"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-zinc-400">NPN</Label>
                      <Input
                        value={formData.npn}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            npn: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                        placeholder="NPN"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-zinc-400">
                        Expiration
                      </Label>
                      <Input
                        type="date"
                        value={formData.license_expiration}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            license_expiration: e.target.value,
                          }))
                        }
                        className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
                  <Label className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-1">
                    <Globe className="h-2.5 w-2.5" /> Social & Web
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      value={formData.linkedin_url}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          linkedin_url: e.target.value,
                        }))
                      }
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      placeholder="LinkedIn URL"
                    />
                    <Input
                      value={formData.instagram_url}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          instagram_url: e.target.value,
                        }))
                      }
                      className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      placeholder="Instagram URL"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-3 mt-0">
                <div className="p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        Send Signup Confirmation
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Email {user.email} to set password
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 border-zinc-200 dark:border-zinc-700"
                      onClick={handleResendInvite}
                      disabled={isSendingInvite}
                    >
                      <Send className="h-2.5 w-2.5 mr-1" />
                      {isSendingInvite ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] space-y-0.5">
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      ID:
                    </span>{" "}
                    <span className="text-zinc-700 dark:text-zinc-300 font-mono">
                      {user.id}
                    </span>
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Created:
                    </span>{" "}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString()
                        : "Unknown"}
                    </span>
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Updated:
                    </span>{" "}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {user.updated_at
                        ? new Date(user.updated_at).toLocaleString()
                        : "Unknown"}
                    </span>
                  </p>
                  {user.onboarding_status && (
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Onboarding:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {user.onboarding_status}
                      </span>
                    </p>
                  )}
                </div>

                <Alert
                  variant="destructive"
                  className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 py-2"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="ml-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-red-700 dark:text-red-400">
                          Delete User Permanently
                        </p>
                        <p className="text-[9px] text-red-600 dark:text-red-500">
                          Cannot be undone
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-2.5 w-2.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="px-4 py-2.5 gap-1.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="h-6 text-[10px] px-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="h-6 text-[10px] px-2"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(isOpen) => {
          setShowDeleteConfirm(isOpen);
        }}
      >
        <AlertDialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Permanently Delete User?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Delete{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {user?.email}
                  </strong>
                  ?
                </p>

                {checkingDependencies && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking for downlines...
                  </div>
                )}

                {!checkingDependencies && downlineCount > 0 && (
                  <div className="p-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded">
                    <div className="flex items-start gap-2">
                      <Users className="h-3 w-3 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          {downlineCount} downline{downlineCount > 1 ? "s" : ""}{" "}
                          must be reassigned
                        </p>
                        {potentialUplines.length > 0 && (
                          <div className="mt-1.5">
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 mb-1">
                              Select new upline:
                            </p>
                            <Select
                              value={reassignUplineId || ""}
                              onValueChange={setReassignUplineId}
                            >
                              <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-800">
                                <SelectValue placeholder="Select new upline..." />
                              </SelectTrigger>
                              <SelectContent>
                                {potentialUplines.map((upline) => (
                                  <SelectItem
                                    key={upline.id}
                                    value={upline.id}
                                    className="text-[11px]"
                                  >
                                    {upline.first_name} {upline.last_name} (
                                    {upline.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                  This will delete all associated data. Cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1.5">
            <AlertDialogCancel
              disabled={isDeleting}
              className="h-7 text-[11px] px-3"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                isDeleting ||
                checkingDependencies ||
                (downlineCount > 0 && !reassignUplineId)
              }
              className="h-7 text-[11px] px-3 bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Deleting...
                </>
              ) : downlineCount > 0 && !reassignUplineId ? (
                "Select upline first"
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
