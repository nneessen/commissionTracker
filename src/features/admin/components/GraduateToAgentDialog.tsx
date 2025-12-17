// src/features/admin/components/GraduateToAgentDialog.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import {
  VALID_CONTRACT_LEVELS,
  type UserProfile,
} from "@/services/users/userService";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface GraduateToAgentDialogProps {
  recruit: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraduateToAgentDialog({
  recruit,
  open,
  onOpenChange,
}: GraduateToAgentDialogProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [contractLevel, setContractLevel] = useState<string>("80");
  const [notes, setNotes] = useState("");

  const graduateMutation = useMutation({
    mutationFn: async () => {
      // Update the user to agent role and mark as completed
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          roles: ["agent"],
          onboarding_status: "completed",
          current_onboarding_phase: "completed",
          approval_status: "approved",
          contract_level: parseInt(contractLevel),
          graduated_at: new Date().toISOString(),
          graduation_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recruit.id);

      if (updateError) throw updateError;

      // Log the graduation in activity log
      await supabase.from("user_activity_log").insert({
        user_id: recruit.id,
        action: "graduated_to_agent",
        description: `Graduated to agent with ${contractLevel}% contract level`,
        metadata: {
          previous_role: "recruit",
          new_role: "agent",
          contract_level: contractLevel,
          notes: notes,
          graduated_by: currentUser?.id,
        },
      });

      // Send notification to upline if exists
      if (recruit.upline_id) {
        await supabase.from("notifications").insert({
          user_id: recruit.upline_id,
          type: "recruit_graduated",
          title: `${recruit.first_name} ${recruit.last_name} Graduated!`,
          message: `Your recruit ${recruit.first_name} ${recruit.last_name} has successfully completed onboarding and is now an active agent with ${contractLevel}% contract level.`,
          metadata: {
            recruit_id: recruit.id,
            recruit_name: `${recruit.first_name} ${recruit.last_name}`,
            contract_level: contractLevel,
            graduated_at: new Date().toISOString(),
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      onOpenChange(false);
      setNotes("");
      setContractLevel("80");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Graduate to Agent
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Promote {recruit.first_name} {recruit.last_name} from recruit to
            licensed agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* What will happen - compact info box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded p-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-[10px] text-amber-800 dark:text-amber-200">
                <span className="font-medium">This action will:</span>
                <ul className="mt-1 space-y-0.5 ml-3 list-disc">
                  <li>Change role from Recruit to Agent</li>
                  <li>Grant access to full agent dashboard</li>
                  <li>Mark onboarding as completed</li>
                  <li>Set their initial contract level</li>
                  <li>Enable commission tracking</li>
                  <li>Notify their upline manager</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contract Level */}
          <div className="space-y-1">
            <Label
              htmlFor="contract-level"
              className="text-[11px] text-zinc-500 dark:text-zinc-400"
            >
              Initial Contract Level
            </Label>
            <Select value={contractLevel} onValueChange={setContractLevel}>
              <SelectTrigger
                id="contract-level"
                className="h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_CONTRACT_LEVELS.map((level) => (
                  <SelectItem
                    key={level}
                    value={level.toString()}
                    className="text-[11px]"
                  >
                    {level}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Determines commission percentage on new business
            </p>
          </div>

          {/* Graduation Notes */}
          <div className="space-y-1">
            <Label
              htmlFor="notes"
              className="text-[11px] text-zinc-500 dark:text-zinc-400"
            >
              Graduation Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Notes about graduation, achievements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 resize-none"
            />
          </div>

          {/* Recruit Info - compact */}
          <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded p-2 border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                Recruit Information
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Started:{" "}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {format(
                    new Date(recruit.created_at || new Date()),
                    "MMM d, yyyy",
                  )}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Phase:{" "}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {recruit.current_onboarding_phase?.replace(/_/g, " ") || "-"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Email:{" "}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {recruit.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-1 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-6 px-2 text-[10px]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => graduateMutation.mutate()}
            disabled={graduateMutation.isPending}
            size="sm"
            className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {graduateMutation.isPending ? "Graduating..." : "Graduate to Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
