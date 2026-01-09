// src/services/underwriting/DecisionTreeRepository.ts

import { BaseRepository, BaseEntity } from "../base/BaseRepository";
import type { Database } from "@/types/database.types";
import type {
  DecisionTree,
  DecisionTreeInsert,
  DecisionTreeUpdate,
  DecisionTreeRules,
} from "@/features/underwriting/types/underwriting.types";

// Database row type
type DecisionTreeRow =
  Database["public"]["Tables"]["underwriting_decision_trees"]["Row"];

// Base entity type for decision trees
export type DecisionTreeBaseEntity = DecisionTreeRow & BaseEntity;

// Insert data interface (camelCase for service layer)
export interface DecisionTreeCreateData {
  imoId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  rules: DecisionTreeRules;
  isActive?: boolean;
  isDefault?: boolean;
}

// Update data interface (camelCase for service layer)
export interface DecisionTreeUpdateData {
  name?: string;
  description?: string | null;
  rules?: DecisionTreeRules;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Repository for decision tree data access
 * Handles all Supabase operations for underwriting_decision_trees table
 */
export class DecisionTreeRepository extends BaseRepository<
  DecisionTreeBaseEntity,
  DecisionTreeInsert,
  DecisionTreeUpdate
> {
  constructor() {
    super("underwriting_decision_trees");
  }

  /**
   * Transform database record to entity (snake_case to camelCase)
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): DecisionTreeBaseEntity {
    return dbRecord as unknown as DecisionTreeBaseEntity;
  }

  /**
   * Transform entity to database record (camelCase to snake_case)
   */
  protected transformToDB(
    data: DecisionTreeInsert | DecisionTreeUpdate,
  ): Record<string, unknown> {
    return data as unknown as Record<string, unknown>;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Find all decision trees for an IMO
   */
  async findByImoId(imoId: string): Promise<DecisionTree[]> {
    try {
      const { data, error } = await this.client
        .from("underwriting_decision_trees")
        .select("*")
        .eq("imo_id", imoId)
        .order("name", { ascending: true });

      if (error) {
        throw this.handleError(error, "findByImoId");
      }

      return (data || []) as DecisionTree[];
    } catch (error) {
      throw this.wrapError(error, "findByImoId");
    }
  }

  /**
   * Find a single decision tree by ID
   */
  async findTreeById(id: string): Promise<DecisionTree | null> {
    try {
      const { data, error } = await this.client
        .from("underwriting_decision_trees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw this.handleError(error, "findTreeById");
      }

      return data as DecisionTree;
    } catch (error) {
      throw this.wrapError(error, "findTreeById");
    }
  }

  /**
   * Find the active default decision tree for an IMO
   */
  async findActiveDefault(imoId: string): Promise<DecisionTree | null> {
    try {
      const { data, error } = await this.client
        .from("underwriting_decision_trees")
        .select("*")
        .eq("imo_id", imoId)
        .eq("is_active", true)
        .eq("is_default", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // No rows found
        throw this.handleError(error, "findActiveDefault");
      }

      return data as DecisionTree;
    } catch (error) {
      throw this.wrapError(error, "findActiveDefault");
    }
  }

  // ============================================
  // Mutation Methods
  // ============================================

  /**
   * Create a new decision tree
   */
  async createTree(data: DecisionTreeCreateData): Promise<DecisionTree> {
    try {
      const dbData: DecisionTreeInsert = {
        imo_id: data.imoId,
        created_by: data.createdBy,
        name: data.name,
        description: data.description || null,
        rules: JSON.parse(JSON.stringify(data.rules)),
        is_active: data.isActive ?? true,
        is_default: data.isDefault ?? false,
      };

      const { data: tree, error } = await this.client
        .from("underwriting_decision_trees")
        .insert(dbData)
        .select()
        .single();

      if (error) {
        throw this.handleError(error, "createTree");
      }

      return tree as DecisionTree;
    } catch (error) {
      throw this.wrapError(error, "createTree");
    }
  }

  /**
   * Update an existing decision tree
   */
  async updateTree(
    id: string,
    data: DecisionTreeUpdateData,
  ): Promise<DecisionTree> {
    try {
      const dbData: DecisionTreeUpdate = {};

      if (data.name !== undefined) dbData.name = data.name;
      if (data.description !== undefined) dbData.description = data.description;
      if (data.rules !== undefined) {
        dbData.rules = JSON.parse(JSON.stringify(data.rules));
      }
      if (data.isActive !== undefined) dbData.is_active = data.isActive;
      if (data.isDefault !== undefined) dbData.is_default = data.isDefault;

      const { data: tree, error } = await this.client
        .from("underwriting_decision_trees")
        .update(dbData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw this.handleError(error, "updateTree");
      }

      return tree as DecisionTree;
    } catch (error) {
      throw this.wrapError(error, "updateTree");
    }
  }

  /**
   * Delete a decision tree
   */
  async deleteTree(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("underwriting_decision_trees")
        .delete()
        .eq("id", id);

      if (error) {
        throw this.handleError(error, "deleteTree");
      }
    } catch (error) {
      throw this.wrapError(error, "deleteTree");
    }
  }

  /**
   * Atomically set a decision tree as default using RPC
   * This prevents race conditions by handling the operation in a single transaction
   */
  async setDefault(treeId: string, imoId: string): Promise<void> {
    try {
      const { error } = await this.client.rpc("set_default_decision_tree", {
        p_tree_id: treeId,
        p_imo_id: imoId,
      });

      if (error) {
        throw this.handleError(error, "setDefault");
      }
    } catch (error) {
      throw this.wrapError(error, "setDefault");
    }
  }
}

// Export singleton instance
export const decisionTreeRepository = new DecisionTreeRepository();
