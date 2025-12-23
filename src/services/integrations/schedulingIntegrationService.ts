// src/services/integrations/schedulingIntegrationService.ts

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";
import type {
  SchedulingIntegration,
  SchedulingIntegrationType,
  CreateSchedulingIntegrationInput,
  UpdateSchedulingIntegrationInput,
} from "@/types/integration.types";

type SchedulingIntegrationRow =
  Database["public"]["Tables"]["scheduling_integrations"]["Row"];
type SchedulingIntegrationInsert =
  Database["public"]["Tables"]["scheduling_integrations"]["Insert"];
type SchedulingIntegrationUpdate =
  Database["public"]["Tables"]["scheduling_integrations"]["Update"];

/**
 * Transform database row to SchedulingIntegration type
 */
function transformRow(row: SchedulingIntegrationRow): SchedulingIntegration {
  return {
    id: row.id,
    user_id: row.user_id,
    imo_id: row.imo_id,
    integration_type: row.integration_type as SchedulingIntegrationType,
    display_name: row.display_name,
    booking_url: row.booking_url,
    meeting_id: row.meeting_id,
    passcode: row.passcode,
    instructions: row.instructions,
    is_active: row.is_active,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

export const schedulingIntegrationService = {
  /**
   * Get all integrations for a user
   */
  async getByUserId(userId: string): Promise<SchedulingIntegration[]> {
    const { data, error } = await supabase
      .from("scheduling_integrations")
      .select("*")
      .eq("user_id", userId)
      .order("integration_type", { ascending: true });

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error fetching integrations:",
        error,
      );
      throw error;
    }

    return (data || []).map(transformRow);
  },

  /**
   * Get active integrations for a user
   */
  async getActiveByUserId(userId: string): Promise<SchedulingIntegration[]> {
    const { data, error } = await supabase
      .from("scheduling_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("integration_type", { ascending: true });

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error fetching active integrations:",
        error,
      );
      throw error;
    }

    return (data || []).map(transformRow);
  },

  /**
   * Get a specific integration by type for a user
   */
  async getByType(
    userId: string,
    integrationType: SchedulingIntegrationType,
  ): Promise<SchedulingIntegration | null> {
    const { data, error } = await supabase
      .from("scheduling_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("integration_type", integrationType)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error fetching integration by type:",
        error,
      );
      throw error;
    }

    return data ? transformRow(data) : null;
  },

  /**
   * Get integration by ID
   */
  async getById(id: string): Promise<SchedulingIntegration | null> {
    const { data, error } = await supabase
      .from("scheduling_integrations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error fetching integration by id:",
        error,
      );
      throw error;
    }

    return data ? transformRow(data) : null;
  },

  /**
   * Create a new integration
   */
  async create(
    userId: string,
    input: CreateSchedulingIntegrationInput,
  ): Promise<SchedulingIntegration> {
    const insertData: SchedulingIntegrationInsert = {
      user_id: userId,
      integration_type: input.integration_type,
      display_name: input.display_name || null,
      booking_url: input.booking_url,
      meeting_id: input.meeting_id || null,
      passcode: input.passcode || null,
      instructions: input.instructions || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("scheduling_integrations")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error creating integration:",
        error,
      );
      throw error;
    }

    return transformRow(data);
  },

  /**
   * Update an existing integration
   */
  async update(
    id: string,
    input: UpdateSchedulingIntegrationInput,
  ): Promise<SchedulingIntegration> {
    const updateData: SchedulingIntegrationUpdate = {};

    if (input.display_name !== undefined)
      updateData.display_name = input.display_name;
    if (input.booking_url !== undefined)
      updateData.booking_url = input.booking_url;
    if (input.meeting_id !== undefined)
      updateData.meeting_id = input.meeting_id;
    if (input.passcode !== undefined) updateData.passcode = input.passcode;
    if (input.instructions !== undefined)
      updateData.instructions = input.instructions;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from("scheduling_integrations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error updating integration:",
        error,
      );
      throw error;
    }

    return transformRow(data);
  },

  /**
   * Upsert an integration (create or update by type)
   * If an integration of the same type already exists for the user, update it.
   * Otherwise, create a new one.
   */
  async upsert(
    userId: string,
    input: CreateSchedulingIntegrationInput,
  ): Promise<SchedulingIntegration> {
    // Check if integration of this type already exists
    const existing = await this.getByType(userId, input.integration_type);

    if (existing) {
      // Update existing
      return this.update(existing.id, {
        display_name: input.display_name,
        booking_url: input.booking_url,
        meeting_id: input.meeting_id,
        passcode: input.passcode,
        instructions: input.instructions,
        is_active: true,
      });
    }

    // Create new
    return this.create(userId, input);
  },

  /**
   * Delete an integration
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("scheduling_integrations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "[schedulingIntegrationService] Error deleting integration:",
        error,
      );
      throw error;
    }
  },

  /**
   * Soft delete (deactivate) an integration
   */
  async deactivate(id: string): Promise<SchedulingIntegration> {
    return this.update(id, { is_active: false });
  },

  /**
   * Reactivate an integration
   */
  async activate(id: string): Promise<SchedulingIntegration> {
    return this.update(id, { is_active: true });
  },
};
