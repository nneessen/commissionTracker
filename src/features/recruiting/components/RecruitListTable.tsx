// src/features/recruiting/components/RecruitListTable.tsx

import React, { useState, useMemo } from "react";
import {UserProfile} from "@/types/hierarchy.types";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {formatDistanceToNow} from "date-fns";
import {usePhases} from "@/features/recruiting/hooks/usePipeline";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {ONBOARDING_STATUS_COLORS} from "@/types/recruiting.types";

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

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function RecruitListTable({
  recruits,
  isLoading,
  selectedRecruitId,
  onSelectRecruit,
}: RecruitListTableProps) {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [recruiterFilter, setRecruiterFilter] = useState<string>("all");

  // Pagination states - default to 10
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch phases for filter dropdown
  const { data: phases } = usePhases(undefined);

  // Extract unique recruiters for filter dropdown
  const recruiters = useMemo(() => {
    const recruiterMap = new Map<string, { id: string; name: string }>();
    recruits.forEach((r) => {
      const recruit = r as RecruitWithRelations;
      if (recruit.recruiter?.id) {
        const name =
          recruit.recruiter.first_name && recruit.recruiter.last_name
            ? `${recruit.recruiter.first_name} ${recruit.recruiter.last_name}`
            : recruit.recruiter.email.split("@")[0];
        recruiterMap.set(recruit.recruiter.id, { id: recruit.recruiter.id, name });
      }
    });
    return Array.from(recruiterMap.values());
  }, [recruits]);

  // Apply filters
  const filteredRecruits = useMemo(() => {
    return recruits.filter((r) => {
      const recruit = r as RecruitWithRelations;
      if (statusFilter !== "all" && recruit.onboarding_status !== statusFilter) return false;
      if (phaseFilter !== "all" && recruit.current_onboarding_phase !== phaseFilter) return false;
      if (recruiterFilter !== "all" && recruit.recruiter?.id !== recruiterFilter) return false;
      return true;
    });
  }, [recruits, statusFilter, phaseFilter, recruiterFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecruits.length / pageSize);
  const paginatedRecruits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecruits.slice(start, start + pageSize);
  }, [filteredRecruits, currentPage, pageSize]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, phaseFilter, recruiterFilter, pageSize]);

  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const getStatusColor = (recruit: UserProfile) => {
    const status = recruit.onboarding_status;
    const updatedAt = new Date(recruit.updated_at || recruit.created_at || new Date().toISOString());
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (status === "dropped") return "bg-red-500";
    if (status === "completed") return "bg-emerald-500";
    if (daysSinceUpdate > 14) return "bg-red-500";
    if (daysSinceUpdate > 7) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Filter Row */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-[120px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All Status</SelectItem>
            <SelectItem value="interview_1" className="text-sm">Interview 1</SelectItem>
            <SelectItem value="zoom_interview" className="text-sm">Zoom</SelectItem>
            <SelectItem value="pre_licensing" className="text-sm">Pre-License</SelectItem>
            <SelectItem value="exam" className="text-sm">Exam</SelectItem>
            <SelectItem value="npn_received" className="text-sm">NPN</SelectItem>
            <SelectItem value="contracting" className="text-sm">Contracting</SelectItem>
            <SelectItem value="bootcamp" className="text-sm">Bootcamp</SelectItem>
            <SelectItem value="completed" className="text-sm">Completed</SelectItem>
            <SelectItem value="dropped" className="text-sm">Dropped</SelectItem>
          </SelectContent>
        </Select>

        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="h-7 w-[120px] text-sm">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All Phases</SelectItem>
            {phases && phases.length > 0
              ? phases.sort((a: any, b: any) => a.phase_order - b.phase_order).map((phase: any) => (
                  <SelectItem key={phase.id} value={phase.phase_name} className="text-sm">
                    {phase.phase_name}
                  </SelectItem>
                ))
              : Array.from(new Set(recruits.map((r) => r.current_onboarding_phase).filter(Boolean))).map((phase) => (
                  <SelectItem key={phase} value={phase!} className="text-sm">{phase}</SelectItem>
                ))}
          </SelectContent>
        </Select>

        <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
          <SelectTrigger className="h-7 w-[130px] text-sm">
            <SelectValue placeholder="Recruiter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All Recruiters</SelectItem>
            {recruiters.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-sm">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{filteredRecruits.length} recruits</span>
      </div>

      {/* Table - Compact with essential columns only */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="h-9">
              <TableHead className="w-8 text-sm font-semibold"></TableHead>
              <TableHead className="text-sm font-semibold">Name</TableHead>
              <TableHead className="text-sm font-semibold">Email</TableHead>
              <TableHead className="text-sm font-semibold">Status</TableHead>
              <TableHead className="text-sm font-semibold">Phase</TableHead>
              <TableHead className="text-sm font-semibold">Recruiter</TableHead>
              <TableHead className="text-sm font-semibold w-16 text-center">Days</TableHead>
              <TableHead className="text-sm font-semibold w-24">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecruits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  {filteredRecruits.length === 0 && recruits.length > 0
                    ? "No recruits match filters"
                    : "No recruits yet. Click 'Add Recruit' to start."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRecruits.map((recruit) => {
                const recruitWithRelations = recruit as RecruitWithRelations;
                const createdDate = new Date(recruit.created_at || new Date().toISOString());
                const updatedDate = new Date(recruit.updated_at || recruit.created_at || new Date().toISOString());
                const daysInPipeline = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <TableRow
                    key={recruit.id}
                    className={`h-10 cursor-pointer hover:bg-muted/50 ${selectedRecruitId === recruit.id ? "bg-blue-500/10" : ""}`}
                    onClick={() => onSelectRecruit(recruit)}
                  >
                    <TableCell className="text-center py-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(recruit)} mx-auto`} />
                    </TableCell>
                    <TableCell className="text-sm font-medium py-2">
                      {recruit.first_name && recruit.last_name
                        ? `${recruit.first_name} ${recruit.last_name}`
                        : recruit.email?.split("@")[0] || "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2 truncate max-w-[200px]">
                      {recruit.email || "—"}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs px-1.5 py-0 ${recruit.onboarding_status ? ONBOARDING_STATUS_COLORS[recruit.onboarding_status] : ''}`}
                      >
                        {recruit.onboarding_status?.replace(/_/g, ' ') || 'New'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2">
                      {recruit.current_onboarding_phase || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2">
                      {recruitWithRelations.recruiter?.first_name
                        ? `${recruitWithRelations.recruiter.first_name[0]}. ${recruitWithRelations.recruiter.last_name || ''}`
                        : recruitWithRelations.recruiter?.email?.split("@")[0] || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground text-center py-2">
                      {daysInPipeline}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2">
                      {formatDistanceToNow(updatedDate, { addSuffix: false })
                        .replace('about ', '')
                        .replace(' days', 'd')
                        .replace(' day', 'd')
                        .replace(' hours', 'h')
                        .replace(' hour', 'h')
                        .replace(' minutes', 'm')
                        .replace(' minute', 'm')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Compact Pagination Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(parseInt(val))}>
            <SelectTrigger className="h-7 w-[60px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-sm">{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm text-muted-foreground">
          {paginatedRecruits.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}–{Math.min(currentPage * pageSize, filteredRecruits.length)} of {filteredRecruits.length}
        </span>
      </div>
    </div>
  );
}
