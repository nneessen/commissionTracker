// src/features/training-modules/services/trainingModuleService.ts
import { supabase } from "@/services/base";
import type {
  TrainingModule,
  CreateModuleInput,
  UpdateModuleInput,
} from "../types/training-module.types";

export const trainingModuleService = {
  async list(filters?: {
    category?: string;
    search?: string;
    publishedOnly?: boolean;
    agencyId?: string;
  }): Promise<TrainingModule[]> {
    let query = supabase
      .from("training_modules")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }
    if (filters?.publishedOnly) {
      query = query.eq("is_published", true);
    }
    if (filters?.agencyId) {
      query = query.eq("agency_id", filters.agencyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as TrainingModule[];
  },

  async getById(id: string): Promise<TrainingModule> {
    const { data, error } = await supabase
      .from("training_modules")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as TrainingModule;
  },

  async getCount(): Promise<number> {
    const { count, error } = await supabase
      .from("training_modules")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count || 0;
  },

  async create(
    input: CreateModuleInput,
    userId: string,
    imoId: string,
  ): Promise<TrainingModule> {
    const { data, error } = await supabase
      .from("training_modules")
      .insert({
        ...input,
        imo_id: imoId,
        created_by: userId,
        tags: input.tags || [],
        metadata: {},
      })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingModule;
  },

  async update(
    id: string,
    input: UpdateModuleInput,
    userId: string,
  ): Promise<TrainingModule> {
    const { data, error } = await supabase
      .from("training_modules")
      .update({ ...input, updated_by: userId })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingModule;
  },

  async publish(id: string, userId: string): Promise<TrainingModule> {
    const { data, error } = await supabase
      .from("training_modules")
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingModule;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("training_modules")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
