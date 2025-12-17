// src/features/training-hub/components/RecruitingTab.tsx
import {useState} from "react";
import {Edit, GraduationCap, UserPlus} from "lucide-react";
import {useAllUsers} from "@/hooks/admin/useUserApproval";
import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import EditUserDialog from "@/features/admin/components/EditUserDialog";
import {GraduateToAgentDialog} from "@/features/admin/components/GraduateToAgentDialog";
import type {RoleName} from "@/types/permissions.types";
import type {UserProfile} from "@/services/users/userService";

interface RecruitingTabProps {
  searchQuery: string;
}

export function RecruitingTab({ searchQuery }: RecruitingTabProps) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [graduatingRecruit, setGraduatingRecruit] = useState<UserProfile | null>(null);
  const [isGraduateDialogOpen, setIsGraduateDialogOpen] = useState(false);

  const { user: currentUser } = useAuth();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();

  // Check if current user can graduate recruits (Admin, Trainer, or Contracting Manager)
  const currentUserProfile = allUsers?.find((u) => u.id === currentUser?.id);
  const canGraduateRecruits = currentUserProfile?.roles?.some((role) =>
    ["admin", "trainer", "contracting_manager"].includes(role as string)
  );

  // Recruits: users WITHOUT 'agent' role AND NOT admins
  // Training Hub sees ALL recruits (no hierarchy filtering)
  const allRecruits =
    allUsers?.filter(
      (u: UserProfile) =>
        !u.roles?.includes("agent" as RoleName) && u.is_admin !== true
    ) || [];

  // Apply search filter
  const filteredRecruits = allRecruits.filter((recruit: UserProfile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${recruit.first_name || ""} ${recruit.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(query) ||
      recruit.email?.toLowerCase().includes(query) ||
      recruit.current_onboarding_phase?.toLowerCase().includes(query)
    );
  });

  const pendingCount = filteredRecruits.length;

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const getPhaseColor = (phase: string | null | undefined): string => {
    const colors: Record<string, string> = {
      application: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      background_check: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      licensing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      bootcamp: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      npn_received: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      contracting: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      dropped: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[phase || ""] || "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  };

  return (
    <div className="flex flex-col h-full p-3">
      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] mb-2">
        <div className="flex items-center gap-1">
          <UserPlus className="h-3 w-3 text-amber-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{pendingCount}</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {pendingCount === 1 ? "recruit" : "recruits"} in pipeline
          </span>
        </div>
      </div>

      {/* Recruits table */}
      <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        {usersLoading ? (
          <div className="p-3 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="h-7 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[180px]">
                  Recruit
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[130px]">
                  Upline
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                  Resident State
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[90px]">
                  Applied
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                  Phase
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecruits.map((recruit: UserProfile) => {
                const recruitName =
                  recruit.first_name && recruit.last_name
                    ? `${recruit.first_name} ${recruit.last_name}`
                    : recruit.email || "Unknown";

                const uplineName = recruit.upline
                  ? recruit.upline.first_name && recruit.upline.last_name
                    ? `${recruit.upline.first_name} ${recruit.upline.last_name}`
                    : recruit.upline.email
                  : null;

                const currentPhase =
                  recruit.current_onboarding_phase ||
                  recruit.onboarding_status ||
                  "Not Started";

                return (
                  <TableRow
                    key={recruit.id}
                    className="h-8 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
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
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {uplineName}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {recruit.resident_state || "-"}
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
                        className={`text-[10px] h-4 px-1 border-0 ${getPhaseColor(currentPhase)}`}
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
                          onClick={() => handleEditUser(recruit)}
                          title="View/Edit full profile"
                        >
                          <Edit className="h-2.5 w-2.5 mr-0.5" />
                          Edit
                        </Button>
                        {canGraduateRecruits &&
                          ["bootcamp", "npn_received", "contracting"].includes(
                            recruit.current_onboarding_phase || ""
                          ) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
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
              {filteredRecruits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
                  >
                    {searchQuery ? "No recruits match your search" : "No recruits in pipeline"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialogs */}
      <EditUserDialog
        user={editingUser}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {graduatingRecruit && (
        <GraduateToAgentDialog
          recruit={graduatingRecruit}
          open={isGraduateDialogOpen}
          onOpenChange={setIsGraduateDialogOpen}
        />
      )}
    </div>
  );
}

export default RecruitingTab;
