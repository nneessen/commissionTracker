// src/features/admin/components/RecruitingPipelineTab.tsx

import { useState } from "react";
import { UserPlus, Edit, GraduationCap } from "lucide-react";
import type { UserProfile } from "@/services/users/userService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraduateToAgentDialog } from "./GraduateToAgentDialog";

interface RecruitingPipelineTabProps {
  recruits: UserProfile[];
  allUsers: UserProfile[] | undefined;
  isLoading: boolean;
  canGraduateRecruits: boolean;
  graduationEligiblePhases: string[];
  onEditRecruit: (recruit: UserProfile) => void;
}

export function RecruitingPipelineTab({
  recruits,
  allUsers,
  isLoading,
  canGraduateRecruits,
  graduationEligiblePhases,
  onEditRecruit,
}: RecruitingPipelineTabProps) {
  const [graduatingRecruit, setGraduatingRecruit] =
    useState<UserProfile | null>(null);
  const [isGraduateDialogOpen, setIsGraduateDialogOpen] = useState(false);

  const pendingCount = recruits.length;

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {pendingCount}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              pending recruits
            </span>
          </div>
        </div>
      </div>

      {/* Recruits table */}
      <div className="flex-1 overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {isLoading ? (
          <div className="p-3 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[180px]">
                  Recruit
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[130px]">
                  Upline
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                  Resident State
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[90px]">
                  Applied
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                  Phase
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruits.map((recruit) => {
                const recruitName =
                  recruit.first_name && recruit.last_name
                    ? `${recruit.first_name} ${recruit.last_name}`
                    : recruit.email;

                // Look up the upline user from allUsers by ID
                const uplineUser = recruit.upline_id
                  ? allUsers?.find((u) => u.id === recruit.upline_id)
                  : null;

                const uplineName = uplineUser
                  ? uplineUser.first_name && uplineUser.last_name
                    ? `${uplineUser.first_name} ${uplineUser.last_name}`
                    : uplineUser.email
                  : null;

                const currentPhase =
                  recruit.current_onboarding_phase ||
                  recruit.onboarding_status ||
                  "Not Started";

                return (
                  <TableRow
                    key={recruit.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                  >
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-[10px] font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                          {recruitName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                            {recruitName}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
                            {recruit.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {uplineName ? (
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
                          {uplineName}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                        {recruit.resident_state || recruit.state || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {recruit.created_at
                          ? new Date(recruit.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="outline"
                        className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px] h-4 px-1"
                      >
                        {currentPhase.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          onClick={() => onEditRecruit(recruit)}
                          title="View/Edit full profile"
                        >
                          <Edit className="h-2.5 w-2.5 mr-0.5" />
                          Edit
                        </Button>
                        {canGraduateRecruits &&
                          graduationEligiblePhases.includes(
                            recruit.current_onboarding_phase || "",
                          ) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              onClick={() => {
                                setGraduatingRecruit(recruit);
                                setIsGraduateDialogOpen(true);
                              }}
                              title="Graduate to Agent"
                            >
                              <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
                              Graduate
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recruits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
                  >
                    No pending recruits
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Graduate to Agent Dialog */}
      {graduatingRecruit && (
        <GraduateToAgentDialog
          recruit={graduatingRecruit}
          open={isGraduateDialogOpen}
          onOpenChange={(open) => {
            setIsGraduateDialogOpen(open);
            if (!open) setGraduatingRecruit(null);
          }}
        />
      )}
    </div>
  );
}
