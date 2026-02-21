// src/features/recruiting/components/ContractingTab.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Briefcase } from "lucide-react";
import { ContractingRequestCard } from "./contracting/ContractingRequestCard";
import { AddCarrierDialog } from "./contracting/AddCarrierDialog";
import {
  useRecruitCarrierContracts,
  useUpdateCarrierContract,
  useAddCarrierContract,
  useDeleteCarrierContract,
} from "../hooks/useRecruitCarrierContracts";
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
      />
    </div>
  );
}
