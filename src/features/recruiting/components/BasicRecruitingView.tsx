// src/features/recruiting/components/BasicRecruitingView.tsx
// Simplified recruiting view for free tier users with recruiting_basic feature

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Mail,
  Phone,
  User,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { GraduateToAgentDialog } from "@/features/admin";
import { useRecruits, useCreateRecruit } from "../hooks";
import { useAuth } from "@/contexts/AuthContext";
import { STAFF_ONLY_ROLES } from "@/constants/roles";
import type { RecruitFilters } from "@/types/recruiting.types";
import type { UserProfile } from "@/types/hierarchy.types";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

interface BasicRecruitingViewProps {
  className?: string;
}

export function BasicRecruitingView({ className }: BasicRecruitingViewProps) {
  const { user } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [graduatingRecruit, setGraduatingRecruit] =
    useState<UserProfile | null>(null);

  // Detect staff role
  const isStaffRole =
    user?.roles?.some((role) =>
      STAFF_ONLY_ROLES.includes(role as (typeof STAFF_ONLY_ROLES)[number]),
    ) ?? false;

  // Build filters based on user role
  const recruitFilters: RecruitFilters | undefined = (() => {
    if (!user?.id) return undefined;

    if (isStaffRole && user.imo_id) {
      return { imo_id: user.imo_id };
    }

    // Filter by upline_id only - users only see recruits where they are the upline
    return { assigned_upline_id: user.id };
  })();

  const { data: recruitsData, isLoading } = useRecruits(recruitFilters, 1, 50, {
    enabled: !!user?.id,
  });

  const recruits = (recruitsData?.data || []) as UserProfile[];

  // Simple status badge mapping
  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      pending: { label: "Pending", variant: "secondary" },
      active: { label: "Active", variant: "default" },
      approved: { label: "Approved", variant: "default" },
      contracted: { label: "Contracted", variant: "default" },
      inactive: { label: "Inactive", variant: "outline" },
      declined: { label: "Declined", variant: "destructive" },
    };

    const statusInfo = statusMap[status || "pending"] || {
      label: status || "Unknown",
      variant: "outline" as const,
    };
    return (
      <Badge variant={statusInfo.variant} className="text-[9px] h-4">
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Recruiting
          </h1>
          <Badge variant="secondary" className="text-[9px] h-4">
            {recruits.length} recruits
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <BasicAddRecruitDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
          />
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-lg px-4 py-3 border border-violet-200 dark:border-violet-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-violet-900 dark:text-violet-100">
              Unlock the Full Recruiting Pipeline
            </p>
            <p className="text-[10px] text-violet-700 dark:text-violet-300">
              Custom stages, automation, bulk actions, analytics, and more
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          asChild
          className="h-7 text-[10px] border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50"
        >
          <Link to="/settings" search={{ tab: "billing" }}>
            Upgrade
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Recruits Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-[11px] text-zinc-500">
            Loading recruits...
          </div>
        ) : recruits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-500">
            <User className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-[11px]">No recruits yet</p>
            <p className="text-[10px] text-zinc-400">
              Add your first recruit to get started
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold h-8">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-semibold h-8">
                  Contact
                </TableHead>
                <TableHead className="text-[10px] font-semibold h-8">
                  Upline
                </TableHead>
                <TableHead className="text-[10px] font-semibold h-8">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-semibold h-8">
                  Added
                </TableHead>
                <TableHead className="text-[10px] font-semibold h-8 w-20">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruits.map((recruit) => (
                <TableRow key={recruit.id} className="cursor-default">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                        {(recruit.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                        {recruit.first_name} {recruit.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-0.5">
                      {recruit.email && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                          <Mail className="h-3 w-3" />
                          {recruit.email}
                        </div>
                      )}
                      {recruit.phone && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                          <Phone className="h-3 w-3" />
                          {recruit.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(recruit as any).upline ? (
                      <span className="text-[10px] text-zinc-700 dark:text-zinc-300">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(recruit as any).upline.first_name}{" "}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(recruit as any).upline.last_name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                        {recruit.upline_id ? "Loading..." : "Not assigned"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {getStatusBadge(recruit.approval_status)}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {recruit.created_at
                        ? formatDistanceToNow(new Date(recruit.created_at), {
                            addSuffix: true,
                          })
                        : "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    {(recruit.approval_status === "pending" ||
                      recruit.approval_status === "active") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20"
                        onClick={() => setGraduatingRecruit(recruit)}
                      >
                        <GraduationCap className="h-3 w-3 mr-0.5" />
                        Graduate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Graduate to Agent Dialog */}
      {graduatingRecruit && (
        <GraduateToAgentDialog
          recruit={graduatingRecruit}
          open={!!graduatingRecruit}
          onOpenChange={(open) => {
            if (!open) setGraduatingRecruit(null);
          }}
        />
      )}
    </div>
  );
}

// Simple add recruit dialog for basic tier
interface BasicAddRecruitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BasicAddRecruitDialog({
  open,
  onOpenChange,
}: BasicAddRecruitDialogProps) {
  const { user } = useAuth();
  const createRecruit = useCreateRecruit();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim())
      newErrors.first_name = "First name is required";
    if (!formData.last_name.trim())
      newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createRecruit.mutateAsync({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        upline_id: user?.id,
        imo_id: user?.imo_id ?? undefined,
      });

      // Success toast is handled by the mutation's onSuccess callback
      setFormData({ first_name: "", last_name: "", email: "", phone: "" });
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by the mutation's onError callback
      // Log for debugging
      console.error("[BasicRecruitingView] Create recruit failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-6 text-[10px] px-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Add Recruit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Add New Recruit</DialogTitle>
          <DialogDescription className="text-[11px] text-zinc-500">
            Add basic contact information for your new recruit.
          </DialogDescription>
        </DialogHeader>

        {/* Upline Assignment Info */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700">
          <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <div className="flex-1">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Assigned Upline
            </p>
            <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
              {user?.first_name} {user?.last_name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="first_name" className="text-[10px]">
                First Name *
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                className="h-8 text-[11px]"
                placeholder="John"
              />
              {errors.first_name && (
                <p className="text-[9px] text-red-500">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name" className="text-[10px]">
                Last Name *
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                className="h-8 text-[11px]"
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="text-[9px] text-red-500">{errors.last_name}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[10px]">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="h-8 text-[11px]"
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="text-[9px] text-red-500">{errors.email}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-[10px]">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="h-8 text-[11px]"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-[10px]"
              disabled={createRecruit.isPending}
            >
              {createRecruit.isPending ? "Adding..." : "Add Recruit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default BasicRecruitingView;
