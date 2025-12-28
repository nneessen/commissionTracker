// src/features/admin/components/AddUserDialog.tsx
import { useState, useMemo } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllRolesWithPermissions } from "@/hooks/permissions/usePermissions";
import { useAllUsers } from "@/hooks/admin/useUserApproval";
import { useAllActiveImos, useAgenciesByImo } from "@/hooks/imo/useImoQueries";
import { useImo } from "@/contexts/ImoContext";
import {
  Mail,
  User,
  Phone,
  Users,
  Check,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types/permissions.types";
import type { ApprovalStatus } from "@/types/user.types";
import { getDisplayName } from "@/types/user.types";

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
  approval_status: ApprovalStatus;
  onboarding_status?: "lead" | "active" | null;
  imo_id?: string | null;
  agency_id?: string | null;
}

const INITIAL_FORM_DATA: NewUserData = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  upline_id: null,
  roles: ["recruit"], // Default to recruit since approval_status defaults to "pending"
  approval_status: "pending",
  onboarding_status: null,
  imo_id: null,
  agency_id: null,
};

export default function AddUserDialog({
  open,
  onOpenChange,
  onSave,
}: AddUserDialogProps) {
  const { data: roles } = useAllRolesWithPermissions();
  const { data: allUsers } = useAllUsers();

  // IMO/Agency hooks
  const { isSuperAdmin, isImoAdmin, imo: currentImo } = useImo();
  const { data: allImos, isLoading: isLoadingImos } = useAllActiveImos();
  const [selectedImoId, setSelectedImoId] = useState<string | null>(null);
  const { data: agenciesForImo, isLoading: isLoadingAgencies } =
    useAgenciesByImo(selectedImoId ?? "");

  const [formData, setFormData] = useState<NewUserData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uplineOpen, setUplineOpen] = useState(false);

  // Initialize selected IMO from context for IMO admins
  useMemo(() => {
    if (isImoAdmin && currentImo?.id && !selectedImoId) {
      setSelectedImoId(currentImo.id);
      setFormData((prev) => ({ ...prev, imo_id: currentImo.id }));
    }
  }, [isImoAdmin, currentImo?.id, selectedImoId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    if (!formData.first_name) newErrors.first_name = "Required";
    if (!formData.last_name) newErrors.last_name = "Required";
    // Roles are auto-set by status toggle (agent/recruit), no need to validate

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
    // Reset IMO selection (unless user is IMO admin, keep their IMO)
    if (!isImoAdmin) {
      setSelectedImoId(null);
    }
  };

  const handleRoleToggle = (roleName: RoleName) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName],
    }));
  };

  // Only show approved users as potential uplines
  const approvedUplines = useMemo(
    () => allUsers?.filter((u) => u.approval_status === "approved") ?? [],
    [allUsers],
  );

  // Get selected upline display name
  const selectedUplineName = useMemo(() => {
    if (!formData.upline_id) return null;
    const upline = approvedUplines.find((u) => u.id === formData.upline_id);
    return upline ? getDisplayName(upline) : null;
  }, [formData.upline_id, approvedUplines]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleReset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="pb-2 space-y-1">
          <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Add New User
          </DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
            A login link will be emailed to the user automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Email */}
          <div>
            <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-2 top-1.5 h-3 w-3 text-zinc-400" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className={`h-7 text-[11px] pl-7 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${errors.email ? "border-red-500" : ""}`}
                placeholder="user@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>
            )}
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                First Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-2 top-1.5 h-3 w-3 text-zinc-400" />
                <Input
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  className={`h-7 text-[11px] pl-7 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${errors.first_name ? "border-red-500" : ""}`}
                  placeholder="First"
                />
              </div>
              {errors.first_name && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  {errors.first_name}
                </p>
              )}
            </div>

            <div>
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${errors.last_name ? "border-red-500" : ""}`}
                placeholder="Last"
              />
              {errors.last_name && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  {errors.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Phone & Upline */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Phone
              </Label>
              <div className="relative">
                <Phone className="absolute left-2 top-1.5 h-3 w-3 text-zinc-400" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="h-7 text-[11px] pl-7 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Upline
              </Label>
              <Popover open={uplineOpen} onOpenChange={setUplineOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={uplineOpen}
                    className="h-7 w-full justify-between text-[11px] pl-7 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 font-normal"
                  >
                    <Users className="absolute left-2 h-3 w-3 text-zinc-400" />
                    <span className="truncate">
                      {selectedUplineName || "No upline"}
                    </span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0 z-[100]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search upline..."
                      className="h-8 text-[11px]"
                    />
                    <CommandList>
                      <CommandEmpty className="py-3 text-[11px]">
                        No user found.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              upline_id: null,
                            }));
                            setUplineOpen(false);
                          }}
                          className="text-[11px]"
                        >
                          <Check
                            className={cn(
                              "mr-1.5 h-3 w-3",
                              formData.upline_id === null
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          No upline
                        </CommandItem>
                        {approvedUplines.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={getDisplayName(user)}
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                upline_id: user.id,
                              }));
                              setUplineOpen(false);
                            }}
                            className="text-[11px]"
                          >
                            <Check
                              className={cn(
                                "mr-1.5 h-3 w-3",
                                formData.upline_id === user.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {getDisplayName(user)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* IMO & Agency Selection */}
          {(isSuperAdmin || isImoAdmin) && (
            <div className="grid grid-cols-2 gap-2">
              {/* IMO Selection - Only for super admins */}
              {isSuperAdmin && (
                <div>
                  <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    IMO
                  </Label>
                  <Select
                    value={selectedImoId || "none"}
                    onValueChange={(value) => {
                      const newImoId = value === "none" ? null : value;
                      setSelectedImoId(newImoId);
                      setFormData((prev) => ({
                        ...prev,
                        imo_id: newImoId,
                        agency_id: null, // Reset agency when IMO changes
                      }));
                    }}
                    disabled={isLoadingImos}
                  >
                    <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                      <Building2 className="h-3 w-3 text-zinc-400 mr-1.5" />
                      <SelectValue placeholder="Select IMO" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-[11px]">
                        No IMO
                      </SelectItem>
                      {allImos?.map((imo) => (
                        <SelectItem
                          key={imo.id}
                          value={imo.id}
                          className="text-[11px]"
                        >
                          {imo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Agency Selection */}
              <div className={isSuperAdmin ? "" : "col-span-2"}>
                <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Agency
                </Label>
                <Select
                  value={formData.agency_id || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      agency_id: value === "none" ? null : value,
                    }))
                  }
                  disabled={
                    (isSuperAdmin && !selectedImoId) || isLoadingAgencies
                  }
                >
                  <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                    <Building2 className="h-3 w-3 text-zinc-400 mr-1.5" />
                    <SelectValue
                      placeholder={
                        isSuperAdmin && !selectedImoId
                          ? "Select IMO first"
                          : "Select Agency"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-[11px]">
                      No Agency
                    </SelectItem>
                    {agenciesForImo?.map((agency) => (
                      <SelectItem
                        key={agency.id}
                        value={agency.id}
                        className="text-[11px]"
                      >
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isSuperAdmin && !selectedImoId && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                    Choose an IMO above to see agencies
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Roles - Compact Inline Checkboxes */}
          {/* Filter out 'recruit' - this is managed by the status toggle */}
          <div>
            <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Additional Roles
              {errors.roles && (
                <span className="text-red-500 ml-1">({errors.roles})</span>
              )}
            </Label>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded border border-zinc-200 dark:border-zinc-700/50">
              {roles
                ?.filter((role) => !["recruit"].includes(role.name))
                .map((role) => (
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
                      className="cursor-pointer text-[11px] font-normal text-zinc-700 dark:text-zinc-300"
                      title={role.description ?? undefined}
                    >
                      {role.display_name}
                    </Label>
                  </div>
                ))}
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Base role (agent/recruit) is set by status below
            </p>
          </div>

          {/* Status Toggle Buttons */}
          <div>
            <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Status
            </Label>
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
                  setFormData((prev) => {
                    // Remove recruit role, add agent role
                    const filteredRoles: RoleName[] = prev.roles.filter(
                      (r) => r !== "recruit",
                    );
                    const hasAgent = filteredRoles.some((r) => r === "agent");
                    return {
                      ...prev,
                      approval_status: "approved",
                      onboarding_status: null,
                      roles: hasAgent
                        ? filteredRoles
                        : [...filteredRoles, "agent" as RoleName],
                    };
                  })
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
                  setFormData((prev) => {
                    // Remove agent role, add recruit role
                    const filteredRoles: RoleName[] = prev.roles.filter(
                      (r) => r !== "agent",
                    );
                    const hasRecruit = filteredRoles.some(
                      (r) => r === "recruit",
                    );
                    return {
                      ...prev,
                      approval_status: "pending",
                      roles: hasRecruit
                        ? filteredRoles
                        : [...filteredRoles, "recruit" as RoleName],
                    };
                  })
                }
              >
                Pending (Recruit)
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {formData.approval_status === "approved"
                ? "User appears in Users & Access"
                : "User appears in Recruiting Pipeline"}
            </p>
          </div>

          {/* Onboarding Status - Only when Pending */}
          {formData.approval_status === "pending" && (
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded border border-zinc-200 dark:border-zinc-700/50">
              <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
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
            className="h-6 px-2 text-[10px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className="h-6 px-2 text-[10px]"
          >
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
