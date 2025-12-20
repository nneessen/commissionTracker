// src/services/recruiting/repositories/RecruitRepository.ts
import { BaseRepository } from "../../base/BaseRepository";
import type { Database } from "@/types/database.types";
import type { UserProfile } from "@/types/hierarchy.types";
import type { RecruitFilters } from "@/types/recruiting.types";

// Database row types
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

// Note: We use UserProfile directly but extend BaseRepository with a compatible interface
// since UserProfile has string dates, not Date objects

// Create/update types (subset of UserProfile fields)
export interface CreateRecruitData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  recruiterId?: string | null;
  uplineId?: string | null;
  roles?: string[];
  agentStatus?: string;
  pipelineTemplateId?: string | null;
  licensingInfo?: Record<string, unknown>;
  onboardingStatus?: string | null;
  currentOnboardingPhase?: string | null;
  onboardingStartedAt?: string | null;
  isAdmin?: boolean;
}

export interface UpdateRecruitData {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string;
  recruiterId?: string | null;
  uplineId?: string | null;
  roles?: string[];
  agentStatus?: string;
  licensingInfo?: Record<string, unknown>;
  onboardingStatus?: string | null;
  currentOnboardingPhase?: string | null;
  onboardingStartedAt?: string | null;
  onboardingCompletedAt?: string | null;
  approvalStatus?: string;
  isAdmin?: boolean;
}

// Paginated result type
export interface PaginatedRecruits {
  data: UserProfile[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Using 'any' for the base entity since UserProfile has string dates, not Date objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RecruitRepository extends BaseRepository<
  any,
  CreateRecruitData,
  UpdateRecruitData
> {
  constructor() {
    super("user_profiles");
  }

  /**
   * Filter IDs to only include actual recruits (exclude agents/admins)
   */
  private filterRecruitIds(users: UserProfileRow[]): string[] {
    return users
      .filter((u) => {
        const hasActiveAgentRole = u.roles?.includes("active_agent");
        const hasAgentRole = u.roles?.includes("agent");
        const hasAdminRole = u.roles?.includes("admin");
        const isAdmin = u.is_admin === true;

        // Exclude if they're an active agent, agent, or admin
        if (hasActiveAgentRole || hasAgentRole || hasAdminRole || isAdmin) {
          return false;
        }

        // Include if they have recruit role OR onboarding_status
        return u.roles?.includes("recruit") || u.onboarding_status !== null;
      })
      .map((u) => u.id);
  }

  /**
   * Find all recruits with filters and pagination
   */
  async findRecruits(
    filters?: RecruitFilters,
    page = 1,
    limit = 50,
  ): Promise<PaginatedRecruits> {
    // First get potential recruit IDs
    const { data: initialData, error: initialError } = await this.client
      .from(this.tableName)
      .select("*")
      .or("roles.cs.{recruit},onboarding_status.not.is.null");

    if (initialError) {
      throw this.handleError(initialError, "findRecruits");
    }

    const recruitIds = this.filterRecruitIds(initialData || []);

    if (recruitIds.length === 0) {
      return { data: [], count: 0, page, limit, totalPages: 0 };
    }

    // Build main query with filters
    let query = this.client
      .from(this.tableName)
      .select(
        `
        *,
        recruiter:recruiter_id(id, email, first_name, last_name),
        upline:upline_id(id, email, first_name, last_name),
        pipeline_template:pipeline_template_id(id, name, description)
      `,
        { count: "exact" },
      )
      .in("id", recruitIds);

    // Apply filters
    if (filters?.onboarding_status && filters.onboarding_status.length > 0) {
      query = query.in("onboarding_status", filters.onboarding_status);
    }
    if (filters?.current_phase && filters.current_phase.length > 0) {
      query = query.in("current_onboarding_phase", filters.current_phase);
    }
    if (filters?.recruiter_id) {
      query = query.eq("recruiter_id", filters.recruiter_id);
    }
    if (filters?.assigned_upline_id) {
      query = query.eq("upline_id", filters.assigned_upline_id);
    }
    if (filters?.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
      );
    }
    if (filters?.date_range) {
      query = query
        .gte("created_at", filters.date_range.start)
        .lte("created_at", filters.date_range.end);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Sort
    query = query.order("updated_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw this.handleError(error, "findRecruits");
    }

    return {
      data: (data || []) as UserProfile[],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Find recruit by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        recruiter:recruiter_id(id, email, first_name, last_name),
        upline:upline_id(id, email, first_name, last_name)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByIdWithRelations");
    }

    return data as UserProfile;
  }

  /**
   * Search recruits by name or email
   */
  async searchRecruits(
    searchTerm: string,
    limit = 10,
  ): Promise<Partial<UserProfile>[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        "id, first_name, last_name, email, profile_photo_url, onboarding_status, agent_status, roles, is_admin",
      )
      .or("roles.cs.{recruit},onboarding_status.not.is.null")
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
      )
      .limit(limit * 2); // Get more to filter

    if (error) {
      throw this.handleError(error, "searchRecruits");
    }

    // Filter out agents/admins
    return (data || [])
      .filter((u) => {
        const hasActiveAgentRole = u.roles?.includes("active_agent");
        const hasAgentRole = u.roles?.includes("agent");
        const hasAdminRole = u.roles?.includes("admin");
        const isAdmin = u.is_admin === true;

        if (hasActiveAgentRole || hasAgentRole || hasAdminRole || isAdmin) {
          return false;
        }
        return u.roles?.includes("recruit") || u.onboarding_status !== null;
      })
      .slice(0, limit) as Partial<UserProfile>[];
  }

  /**
   * Get recruiting statistics
   */
  async getStats(recruiterId?: string): Promise<{
    total: number;
    active: number;
    completed: number;
    dropped: number;
    byPhase: Record<string, number>;
  }> {
    let query = this.client
      .from(this.tableName)
      .select("*")
      .or("roles.cs.{recruit},onboarding_status.not.is.null");

    if (recruiterId) {
      query = query.eq("recruiter_id", recruiterId);
    }

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "getStats");
    }

    // Filter to actual recruits
    const recruits = ((data as UserProfileRow[]) || []).filter((u) => {
      const hasActiveAgentRole = u.roles?.includes("active_agent");
      const hasAgentRole = u.roles?.includes("agent");
      const hasAdminRole = u.roles?.includes("admin");
      const isAdmin = u.is_admin === true;

      if (hasActiveAgentRole || hasAgentRole || hasAdminRole || isAdmin) {
        return false;
      }
      return u.roles?.includes("recruit") || u.onboarding_status !== null;
    });

    const activePhases = [
      "interview_1",
      "zoom_interview",
      "pre_licensing",
      "exam",
      "npn_received",
      "contracting",
      "bootcamp",
    ];

    return {
      total: recruits.length,
      active: recruits.filter(
        (r) =>
          r.onboarding_status && activePhases.includes(r.onboarding_status),
      ).length,
      completed: recruits.filter((r) => r.onboarding_status === "completed")
        .length,
      dropped: recruits.filter((r) => r.onboarding_status === "dropped").length,
      byPhase: recruits.reduce(
        (acc, recruit) => {
          const status = recruit.onboarding_status || "interview_1";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Update onboarding status
   */
  async updateOnboardingStatus(
    id: string,
    status: string,
    phase?: string,
  ): Promise<UserProfile> {
    const updates: Record<string, unknown> = {
      onboarding_status: status,
      updated_at: new Date().toISOString(),
    };

    if (phase) {
      updates.current_onboarding_phase = phase;
    }

    if (status === "completed") {
      updates.onboarding_completed_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateOnboardingStatus");
    }

    return data as UserProfile;
  }

  /**
   * Delete recruit via RPC (admin function)
   */
  async deleteRecruit(id: string): Promise<void> {
    const { data, error } = await this.client.rpc("admin_deleteuser", {
      target_user_id: id,
    });

    if (error) {
      throw new Error(`Failed to delete recruit: ${error.message}`);
    }

    if (
      data &&
      typeof data === "object" &&
      (data as Record<string, unknown>).success === false
    ) {
      throw new Error(
        ((data as Record<string, unknown>).error as string) ||
          "Failed to delete recruit",
      );
    }
  }

  /**
   * Transform database row to entity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected transformFromDB(dbRecord: Record<string, unknown>): any {
    return dbRecord as unknown as UserProfile;
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreateRecruitData | UpdateRecruitData,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateRecruitData;
      const dbData: Record<string, unknown> = {};

      if (updateData.firstName !== undefined)
        dbData.first_name = updateData.firstName;
      if (updateData.lastName !== undefined)
        dbData.last_name = updateData.lastName;
      if (updateData.phone !== undefined) dbData.phone = updateData.phone;
      if (updateData.email !== undefined) dbData.email = updateData.email;
      if (updateData.recruiterId !== undefined)
        dbData.recruiter_id = updateData.recruiterId;
      if (updateData.uplineId !== undefined)
        dbData.upline_id = updateData.uplineId;
      if (updateData.roles !== undefined) dbData.roles = updateData.roles;
      if (updateData.agentStatus !== undefined)
        dbData.agent_status = updateData.agentStatus;
      if (updateData.licensingInfo !== undefined)
        dbData.licensing_info = updateData.licensingInfo;
      if (updateData.onboardingStatus !== undefined)
        dbData.onboarding_status = updateData.onboardingStatus;
      if (updateData.currentOnboardingPhase !== undefined)
        dbData.current_onboarding_phase = updateData.currentOnboardingPhase;
      if (updateData.onboardingStartedAt !== undefined)
        dbData.onboarding_started_at = updateData.onboardingStartedAt;
      if (updateData.onboardingCompletedAt !== undefined)
        dbData.onboarding_completed_at = updateData.onboardingCompletedAt;
      if (updateData.approvalStatus !== undefined)
        dbData.approval_status = updateData.approvalStatus;
      if (updateData.isAdmin !== undefined)
        dbData.is_admin = updateData.isAdmin;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateRecruitData;
    return {
      email: createData.email,
      first_name: createData.firstName,
      last_name: createData.lastName,
      phone: createData.phone ?? null,
      recruiter_id: createData.recruiterId ?? null,
      upline_id: createData.uplineId ?? null,
      roles: createData.roles ?? ["recruit"],
      agent_status: createData.agentStatus ?? "unlicensed",
      pipeline_template_id: createData.pipelineTemplateId ?? null,
      licensing_info: createData.licensingInfo ?? {},
      onboarding_status: createData.onboardingStatus ?? null,
      current_onboarding_phase: createData.currentOnboardingPhase ?? null,
      onboarding_started_at: createData.onboardingStartedAt ?? null,
      is_admin: createData.isAdmin ?? false,
      hierarchy_path: "",
      hierarchy_depth: 0,
      approval_status: "pending",
    };
  }
}
