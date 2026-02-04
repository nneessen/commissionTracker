// src/features/settings/agency/AgencyManagement.tsx
// Agency Management tab for IMO admins

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Building2,
  Users,
  MoreHorizontal,
  Crown,
  Trash2,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMyImoAgencies,
  useCreateAgencyWithCascade,
  useUpdateAgency,
  useDeleteAgency,
  useDeactivateAgency,
  useAgencyMetrics,
} from "@/hooks/imo";
import { useImo } from "@/hooks/imo";
import { AgencyForm } from "./components/AgencyForm";
import type { Agency, CreateAgencyData, UpdateAgencyData } from "@/types/imo.types";

export function AgencyManagement() {
  const { imo, isImoAdmin, isSuperAdmin } = useImo();
  const { data: agencies, isLoading } = useMyImoAgencies();
  const createAgencyWithCascade = useCreateAgencyWithCascade();
  const updateAgency = useUpdateAgency();
  const deleteAgency = useDeleteAgency();
  const deactivateAgency = useDeactivateAgency();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const canManage = isImoAdmin || isSuperAdmin;

  // Filter agencies based on search
  const filteredAgencies = React.useMemo(() => {
    if (!agencies) return [];
    if (!searchTerm) return agencies;

    const search = searchTerm.toLowerCase();
    return agencies.filter(
      (agency) =>
        agency.name.toLowerCase().includes(search) ||
        agency.code.toLowerCase().includes(search)
    );
  }, [agencies, searchTerm]);

  const handleAddAgency = () => {
    setSelectedAgency(null);
    setIsFormOpen(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setIsFormOpen(true);
  };

  const handleDeleteAgency = async (agency: Agency) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${agency.name}"? This cannot be undone.`
      )
    ) {
      try {
        await deleteAgency.mutateAsync(agency.id);
        toast.success("Agency deleted successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete agency";
        toast.error(message);
      }
    }
  };

  const handleDeactivateAgency = async (agency: Agency) => {
    if (
      window.confirm(
        `Are you sure you want to deactivate "${agency.name}"? This will hide the agency but preserve data.`
      )
    ) {
      try {
        await deactivateAgency.mutateAsync(agency.id);
        toast.success("Agency deactivated");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to deactivate agency";
        toast.error(message);
      }
    }
  };

  const handleFormSubmit = async (
    data: CreateAgencyData | UpdateAgencyData,
    options?: { cascadeDownlines?: boolean }
  ) => {
    try {
      if (selectedAgency) {
        await updateAgency.mutateAsync({
          id: selectedAgency.id,
          data: data as UpdateAgencyData,
        });
        toast.success("Agency updated successfully");
      } else {
        // Add imo_id from current context
        if (!imo?.id) {
          toast.error("No IMO context available");
          return;
        }
        const createData = {
          ...data,
          imo_id: imo.id,
        } as CreateAgencyData;

        // Use cascade-enabled mutation
        const result = await createAgencyWithCascade.mutateAsync({
          data: createData,
          options: { cascadeDownlines: options?.cascadeDownlines },
        });

        // Show appropriate toast based on cascade result
        if (result.cascadeResult?.success && result.cascadeResult.totalUpdated > 0) {
          toast.success(
            `Agency created - ${result.cascadeResult.totalUpdated} user${
              result.cascadeResult.totalUpdated === 1 ? "" : "s"
            } assigned`
          );
        } else if (result.cascadeResult && !result.cascadeResult.success) {
          toast.warning(
            "Agency created but team assignment failed. You can manually assign users."
          );
        } else {
          toast.success("Agency created successfully");
        }
      }
      setIsFormOpen(false);
      setSelectedAgency(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
      console.error("Agency form submit error:", error);
    }
  };

  if (!imo) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          No IMO context available
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading agencies...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Agency Management
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Manage agencies within {imo.name}
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={handleAddAgency}
            >
              <Plus className="h-3 w-3 mr-1" />
              New Agency
            </Button>
          )}
        </div>

        <div className="p-3 space-y-2">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search agencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
            />
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Agency Name
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                    Code
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[150px]">
                    Owner
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px]">
                    Agents
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px]">
                    Status
                  </TableHead>
                  {canManage && (
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px] text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgencies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
                    >
                      {searchTerm
                        ? "No agencies found matching your search."
                        : 'No agencies yet. Click "New Agency" to add one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgencies.map((agency) => (
                    <AgencyTableRow
                      key={agency.id}
                      agency={agency}
                      canManage={canManage}
                      onEdit={handleEditAgency}
                      onDelete={handleDeleteAgency}
                      onDeactivate={handleDeactivateAgency}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Form Sheet */}
      {canManage && (
        <AgencyForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          agency={selectedAgency}
          imoId={imo.id}
          onSubmit={handleFormSubmit}
          isSubmitting={createAgencyWithCascade.isPending || updateAgency.isPending}
        />
      )}
    </>
  );
}

// Separate row component to use hooks per-row for metrics
function AgencyTableRow({
  agency,
  canManage,
  onEdit,
  onDelete,
  onDeactivate,
}: {
  agency: Agency;
  canManage: boolean;
  onEdit: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
  onDeactivate: (agency: Agency) => void;
}) {
  const { data: metrics } = useAgencyMetrics(agency.id);

  return (
    <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50">
      <TableCell className="py-1.5">
        <div className="flex flex-col">
          <span className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100">
            {agency.name}
          </span>
          {agency.contact_email && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {agency.contact_email}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-1.5">
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
          {agency.code}
        </Badge>
      </TableCell>
      <TableCell className="py-1.5">
        {agency.owner ? (
          <div className="flex items-center gap-1.5">
            <Crown className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
              {agency.owner.first_name && agency.owner.last_name
                ? `${agency.owner.first_name} ${agency.owner.last_name}`
                : agency.owner.email}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
            No owner assigned
          </span>
        )}
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <Users className="h-3 w-3" />
          {metrics?.total_agents ?? "—"}
        </div>
      </TableCell>
      <TableCell className="py-1.5">
        <Badge
          variant={agency.is_active ? "default" : "secondary"}
          className="text-[10px] h-4 px-1"
        >
          {agency.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      {canManage && (
        <TableCell className="py-1.5 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-zinc-600 dark:text-zinc-400"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => onEdit(agency)}
                className="text-[11px]"
              >
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeactivate(agency)}
                className="text-[11px] text-amber-600"
              >
                <EyeOff className="h-3 w-3 mr-2" />
                Deactivate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(agency)}
                className="text-[11px] text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}
