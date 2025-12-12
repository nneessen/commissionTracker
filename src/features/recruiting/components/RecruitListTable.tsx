// src/features/recruiting/components/RecruitListTable.tsx

import React, { useState, useMemo } from "react";
import {UserProfile} from "@/types/hierarchy.types";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {formatDistanceToNow} from "date-fns";
import {useTemplates, usePhases} from "@/features/recruiting/hooks/usePipeline";

// Extended type for recruits with joined data
type RecruitWithRelations = UserProfile & {
  recruiter?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
  upline?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
  pipeline_template?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  pipeline_template_id?: string | null;
};

interface RecruitListTableProps {
  recruits: UserProfile[];
  isLoading?: boolean;
  selectedRecruitId?: string;
  onSelectRecruit: (recruit: UserProfile) => void;
}

export function RecruitListTable({
  recruits,
  isLoading,
  selectedRecruitId,
  onSelectRecruit,
}: RecruitListTableProps) {
  // Filter states
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [recruiterFilter, setRecruiterFilter] = useState<string>("all");
  const [uplineFilter, setUplineFilter] = useState<string>("all");

  // Fetch pipeline templates
  const { data: templates } = useTemplates();

  // Fetch phases for selected pipeline (or all phases if 'all' is selected)
  const { data: phases } = usePhases(
    pipelineFilter !== "all" ? pipelineFilter : undefined,
  );

  // Extract unique recruiters and uplines for filter dropdowns
  const { recruiters, uplines } = useMemo(() => {
    const recruiterMap = new Map<string, { id: string; name: string }>();
    const uplineMap = new Map<string, { id: string; name: string }>();

    recruits.forEach((r) => {
      const recruit = r as RecruitWithRelations;
      if (recruit.recruiter?.id) {
        const name =
          recruit.recruiter.first_name && recruit.recruiter.last_name
            ? `${recruit.recruiter.first_name} ${recruit.recruiter.last_name}`
            : recruit.recruiter.email.split("@")[0];
        recruiterMap.set(recruit.recruiter.id, {
          id: recruit.recruiter.id,
          name,
        });
      }
      if (recruit.upline?.id) {
        const name =
          recruit.upline.first_name && recruit.upline.last_name
            ? `${recruit.upline.first_name} ${recruit.upline.last_name}`
            : recruit.upline.email.split("@")[0];
        uplineMap.set(recruit.upline.id, { id: recruit.upline.id, name });
      }
    });

    return {
      recruiters: Array.from(recruiterMap.values()),
      uplines: Array.from(uplineMap.values()),
    };
  }, [recruits]);

  // Apply filters - filter by pipeline, phase, recruiter, and upline
  const filteredRecruits = useMemo(() => {
    return recruits.filter((r) => {
      const recruit = r as RecruitWithRelations;

      if (
        pipelineFilter !== "all" &&
        recruit.pipeline_template_id !== pipelineFilter
      ) {
        return false;
      }
      if (
        phaseFilter !== "all" &&
        recruit.current_onboarding_phase !== phaseFilter
      ) {
        return false;
      }
      if (
        recruiterFilter !== "all" &&
        recruit.recruiter?.id !== recruiterFilter
      ) {
        return false;
      }
      if (uplineFilter !== "all" && recruit.upline?.id !== uplineFilter) {
        return false;
      }
      return true;
    });
  }, [recruits, pipelineFilter, phaseFilter, recruiterFilter, uplineFilter]);

  // When pipeline changes, reset phase filter
  React.useEffect(() => {
    setPhaseFilter("all");
  }, [pipelineFilter]);

  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  const getStatusIndicator = (recruit: UserProfile) => {
    const status = recruit.onboarding_status;
    const updatedAt = new Date(recruit.updated_at || recruit.created_at);
    const daysSinceUpdate = Math.floor(
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (status === "dropped") return "🔴";
    if (status === "completed") return "✅";
    if (daysSinceUpdate > 14) return "🔴";
    if (daysSinceUpdate > 7) return "🟡";
    return "🟢";
  };

  return (
    <div className="h-full flex flex-col">
      <Table className="table-fixed w-full">
        <TableHeader className="sticky top-0 bg-background z-10">
          {/* Filter Row */}
          <TableRow className="h-7 border-b-0">
            <TableHead className="w-5 p-0"></TableHead>
            <TableHead className="p-0.5 w-24">
              <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                <SelectTrigger className="h-5 text-[10px] px-2">
                  <SelectValue placeholder="Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Pipelines
                  </SelectItem>
                  {templates && templates.length > 0
                    ? templates
                        .filter((t: any) => t.is_active)
                        .map((template: any) => (
                          <SelectItem
                            key={template.id}
                            value={template.id}
                            className="text-xs"
                          >
                            {template.name}
                          </SelectItem>
                        ))
                    : null}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-0.5 w-28">
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger className="h-5 text-[10px] px-1 border-dashed">
                  <SelectValue placeholder="Phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Phases
                  </SelectItem>
                  {phases && phases.length > 0
                    ? phases
                        .sort((a: any, b: any) => a.phase_order - b.phase_order)
                        .map((phase: any) => (
                          <SelectItem
                            key={phase.id}
                            value={phase.phase_name}
                            className="text-xs"
                          >
                            {phase.phase_name}
                          </SelectItem>
                        ))
                    : pipelineFilter === "all"
                      ? // If no pipeline selected, show all unique phases from recruits
                        Array.from(
                          new Set(
                            recruits
                              .map((r) => r.current_onboarding_phase)
                              .filter(Boolean),
                          ),
                        ).map((phase) => (
                          <SelectItem
                            key={phase}
                            value={phase!}
                            className="text-xs"
                          >
                            {phase}
                          </SelectItem>
                        ))
                      : null}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-0.5">
              <Select
                value={recruiterFilter}
                onValueChange={setRecruiterFilter}
              >
                <SelectTrigger className="h-5 text-[10px] px-1 border-dashed">
                  <SelectValue placeholder="Recruiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Recruiters
                  </SelectItem>
                  {recruiters.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-0.5">
              <Select value={uplineFilter} onValueChange={setUplineFilter}>
                <SelectTrigger className="h-5 text-[10px] px-1 border-dashed">
                  <SelectValue placeholder="Upline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Uplines
                  </SelectItem>
                  {uplines.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="w-8 p-0"></TableHead>
            <TableHead className="w-14 p-0"></TableHead>
          </TableRow>
          {/* Header Row */}
          <TableRow className="h-6">
            <TableHead className="w-5 p-0.5 text-[10px]"></TableHead>
            <TableHead className="p-0.5 text-[10px] font-semibold w-24">
              Pipeline
            </TableHead>
            <TableHead className="p-0.5 text-[10px] font-semibold w-28">
              Phase
            </TableHead>
            <TableHead className="p-0.5 text-[10px] font-semibold">
              Recruiter
            </TableHead>
            <TableHead className="p-0.5 text-[10px] font-semibold">
              Upline
            </TableHead>
            <TableHead className="p-0.5 text-[10px] font-semibold w-8 text-center">
              D
            </TableHead>
            <TableHead className="p-0.5 text-[10px] font-semibold w-14">
              Last
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecruits.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-xs text-muted-foreground py-8"
              >
                No recruits match the current filters
              </TableCell>
            </TableRow>
          ) : (
            filteredRecruits.map((recruit) => {
              const updatedDate = new Date(
                recruit.updated_at || recruit.created_at,
              );
              const daysInPhase = Math.floor(
                (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24),
              );
              const recruitWithRelations = recruit as RecruitWithRelations;

              return (
                <TableRow
                  key={recruit.id}
                  className={`h-6 cursor-pointer hover:bg-muted/50 ${
                    selectedRecruitId === recruit.id ? "bg-muted" : ""
                  }`}
                  onClick={() => onSelectRecruit(recruit)}
                >
                  <TableCell className="p-0.5 text-center text-xs">
                    {getStatusIndicator(recruit)}
                  </TableCell>
                  <TableCell className="p-0.5 text-[10px] truncate">
                    {recruitWithRelations.pipeline_template?.name || "Standard"}
                  </TableCell>
                  <TableCell className="p-0.5 text-xs truncate">
                    {recruit.current_onboarding_phase || "Not Started"}
                  </TableCell>
                  <TableCell className="p-0.5 text-[10px] text-muted-foreground truncate">
                    {recruitWithRelations.recruiter?.first_name &&
                    recruitWithRelations.recruiter?.last_name
                      ? `${recruitWithRelations.recruiter.first_name[0]}. ${recruitWithRelations.recruiter.last_name}`
                      : recruitWithRelations.recruiter?.email?.split("@")[0] ||
                        "-"}
                  </TableCell>
                  <TableCell className="p-0.5 text-[10px] text-muted-foreground truncate">
                    {recruitWithRelations.upline?.first_name &&
                    recruitWithRelations.upline?.last_name
                      ? `${recruitWithRelations.upline.first_name[0]}. ${recruitWithRelations.upline.last_name}`
                      : recruitWithRelations.upline?.email?.split("@")[0] ||
                        "-"}
                  </TableCell>
                  <TableCell className="p-0.5 text-[10px] text-muted-foreground text-center">
                    {daysInPhase}
                  </TableCell>
                  <TableCell className="p-0.5 text-[10px] text-muted-foreground truncate">
                    {recruit.updated_at
                      ? formatDistanceToNow(new Date(recruit.updated_at), {
                          addSuffix: false,
                        })
                          .replace("about ", "")
                          .replace(" days", "d")
                          .replace(" day", "d")
                          .replace(" hours", "h")
                          .replace(" hour", "h")
                          .replace(" minutes", "m")
                          .replace(" minute", "m")
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {/* Footer with count */}
      <div className="text-[10px] text-muted-foreground px-2 py-1 border-t">
        {filteredRecruits.length} of {recruits.length} recruits
      </div>
    </div>
  );
}
