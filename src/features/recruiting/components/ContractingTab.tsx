// src/features/recruiting/components/ContractingTab.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Briefcase, Info } from "lucide-react";
import { ContractingRequestCard } from "./contracting/ContractingRequestCard";
import { AddCarrierDialog } from "./contracting/AddCarrierDialog";
import {
  useRecruitCarrierContracts,
  useUpdateCarrierContract,
  useAddCarrierContract,
  useDeleteCarrierContract,
} from "../hooks/useRecruitCarrierContracts";
import { useUplineCarrierContracts } from "../hooks/useUplineCarrierContracts";
import { useQuery } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import type {
  RecruitEntity,
  RecruitPermissions,
} from "../types/recruit-detail.types";

interface ContractingTabProps {
  entity: RecruitEntity;
  permissions: RecruitPermissions;
}

export function ContractingTab({ entity, permissions }: ContractingTabProps) {
  const [showAddCarrierDialog, setShowAddCarrierDialog] = useState(false);

  // For invitations, don't fetch contracts
  const recruitId = entity.kind === "registered" ? entity.recruitId : undefined;

  // Extract upline info from the recruit
  const uplineId = entity.recruit?.upline_id ?? null;

  // Fetch upline name if we have an upline_id
  const { data: uplineProfile } = useQuery({
    queryKey: ["upline-name", uplineId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("id", uplineId!)
        .single();
      return data;
    },
    enabled: !!uplineId,
  });

  const uplineName = uplineProfile
    ? `${uplineProfile.first_name || ""} ${uplineProfile.last_name || ""}`.trim()
    : undefined;

  // Fetch upline's active carrier count for the banner
  const { data: uplineCarrierIds } = useUplineCarrierContracts(uplineId);
  const uplineCarrierCount = uplineCarrierIds?.length ?? 0;

  const {
    data: contractRequests,
    isLoading,
    error,
  } = useRecruitCarrierContracts(recruitId);
  const updateContract = useUpdateCarrierContract(recruitId);
  const addContract = useAddCarrierContract(recruitId);
  const deleteContract = useDeleteCarrierContract(recruitId);

  if (entity.kind === "invitation") {
    return (
      <div className="py-8 text-center">
        <Briefcase className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">Available after registration</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-xs text-red-500">Failed to load contracts</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Briefcase className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2 animate-pulse" />
        <p className="text-xs text-zinc-500">Loading contracts...</p>
      </div>
    );
  }

  const handleUpdate = async (id: string, updates: Record<string, unknown>) => {
    await updateContract.mutateAsync({ id, updates });
  };

  const handleAdd = async (carrierId: string) => {
    await addContract.mutateAsync(carrierId);
  };

  const handleDelete = async (id: string) => {
    await deleteContract.mutateAsync(id);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Carrier Contracts
        </h3>
        {permissions.isStaff && (
          <Button
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setShowAddCarrierDialog(true)}
          >
            Add Carrier
          </Button>
        )}
      </div>

      {/* Upline context banner */}
      {uplineId && uplineName && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50 mb-2">
          <Info className="h-3 w-3 text-zinc-400 flex-shrink-0" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Carriers available through{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {uplineName}
            </span>
            &apos;s contracts ({uplineCarrierCount} active)
          </p>
        </div>
      )}
      {!uplineId && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50 mb-2">
          <Info className="h-3 w-3 text-zinc-400 flex-shrink-0" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            No upline assigned — all carriers available
          </p>
        </div>
      )}

      {contractRequests?.map((request) => (
        <ContractingRequestCard
          key={request.id}
          request={request}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isStaff={permissions.isStaff}
        />
      ))}

      {(!contractRequests || contractRequests.length === 0) && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No carrier contracts requested yet.
        </div>
      )}

      <AddCarrierDialog
        recruitId={entity.recruitId}
        open={showAddCarrierDialog}
        onClose={() => setShowAddCarrierDialog(false)}
        onAdd={handleAdd}
        uplineId={uplineId}
        uplineName={uplineName}
      />
    </div>
  );
}
