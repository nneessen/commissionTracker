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
      application: "bg-slate-100 text-slate-700",
      background_check: "bg-amber-100 text-amber-700",
      licensing: "bg-blue-100 text-blue-700",
      bootcamp: "bg-purple-100 text-purple-700",
      npn_received: "bg-teal-100 text-teal-700",
      contracting: "bg-green-100 text-green-700",
      completed: "bg-emerald-100 text-emerald-700",
      dropped: "bg-red-100 text-red-700",
    };
    return colors[phase || ""] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex flex-col h-full space-y-2 p-3">
      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{pendingCount}</span>
          <span className="text-muted-foreground">
            {pendingCount === 1 ? "recruit" : "recruits"} in pipeline
          </span>
        </div>
      </div>

      {/* Recruits table */}
      <div className="flex-1 overflow-auto rounded-lg shadow-sm bg-background border">
        {usersLoading ? (
          <div className="p-3 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="bg-muted/50 border-b">
                <TableHead className="h-8 text-[11px] font-semibold w-[180px]">
                  Recruit
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold w-[130px]">
                  Upline
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold w-[100px]">
                  Resident State
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold w-[90px]">
                  Applied
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold w-[100px]">
                  Phase
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold w-[100px] text-right">
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
                    className="hover:bg-muted/30 border-b"
                  >
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-yellow-100 flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {recruitName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[11px] truncate leading-tight">
                            {recruitName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate leading-tight">
                            {recruit.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {uplineName ? (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {uplineName}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {recruit.resident_state || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {recruit.created_at
                          ? new Date(recruit.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1 ${getPhaseColor(currentPhase)}`}
                      >
                        {currentPhase.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px]"
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
                              className="h-5 px-1.5 text-[10px] text-green-600 hover:text-green-700"
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
                    className="text-center text-xs text-muted-foreground py-6"
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
