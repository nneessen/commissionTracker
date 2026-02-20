// src/features/training-modules/services/trainingAssignmentService.ts
import { supabase } from "@/services/base";
import type {
  TrainingAssignment,
  CreateAssignmentInput,
} from "../types/training-module.types";

export const trainingAssignmentService = {
  async listByModule(moduleId: string): Promise<TrainingAssignment[]> {
    const { data, error } = await supabase
      .from("training_assignments")
      .select("*, module:training_modules(*)")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as TrainingAssignment[];
  },

  async listMyAssignments(userId: string): Promise<TrainingAssignment[]> {
    // Fetch individual assignments + agency-wide assignments (assigned_to is null)
    // RLS already restricts to same imo_id, so this is safe
    const { data, error } = await supabase
      .from("training_assignments")
      .select("*, module:training_modules(*)")
      .eq("status", "active")
      .or(`assigned_to.eq.${userId},assigned_to.is.null`)
      .order("priority", { ascending: false });
    if (error) throw error;
    return data as unknown as TrainingAssignment[];
  },

  async create(
    input: CreateAssignmentInput,
    assignedBy: string,
    imoId: string,
    moduleVersion: number,
  ): Promise<TrainingAssignment> {
    const { data, error } = await supabase
      .from("training_assignments")
      .insert({
        ...input,
        assigned_by: assignedBy,
        imo_id: imoId,
        module_version: moduleVersion,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("This module is already assigned to the selected user.");
      }
      throw error;
    }
    return data as TrainingAssignment;
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from("training_assignments")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) throw error;
  },
};
