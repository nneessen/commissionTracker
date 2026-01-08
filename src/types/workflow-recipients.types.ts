// Recipient types for workflow email actions

export type RecipientType =
  // Hierarchy-based
  | "direct_upline"
  | "direct_downline"
  | "entire_downline"
  | "upline_chain"
  // Role-based
  | "role"
  | "all_agents"
  | "all_managers"
  | "all_trainers"
  | "admins"
  // Event context
  | "policy_agent"
  | "policy_client"
  | "commission_recipient"
  | "eventuser"
  // Recruiting pipeline
  | "pipeline_phase"
  | "pipeline_recruiter"
  | "pipeline_upline"
  // Custom
  | "specific_email"
  | "email_list"
  | "dynamic_field"
  /**
   * Legacy types (backward compatibility)
   * @deprecated Use the modern equivalents instead:
   * - 'triggeruser' → 'eventuser'
   * - 'currentuser' → 'eventuser'
   * - 'manager' → 'direct_upline'
   */
  | "triggeruser"
  | "currentuser"
  | "manager";

export type PhaseStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked";

export interface RecipientConfig {
  type: RecipientType;
  // For 'role' type
  roles?: string[];
  // For 'pipeline_phase' type
  phaseIds?: string[];
  phaseStatuses?: PhaseStatus[];
  // For 'specific_email' and 'email_list'
  emails?: string[];
  // For 'dynamic_field'
  fieldPath?: string;
  // Options
  includeInactive?: boolean;
  maxRecipients?: number; // Default: 50
}

export interface ResolvedRecipients {
  emails: string[];
  userIds: string[];
  count: number;
  truncated: boolean; // True if maxRecipients limit was hit
}

// Human-readable labels for UI
export const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
  // Hierarchy
  direct_upline: "Direct Manager",
  direct_downline: "Direct Reports",
  entire_downline: "Entire Downline",
  upline_chain: "All Upline (to Top)",
  // Role-based
  role: "Specific Role(s)",
  all_agents: "All Licensed Agents",
  all_managers: "All Managers",
  all_trainers: "All Trainers",
  admins: "Admins Only",
  // Event context
  policy_agent: "Policy Agent",
  policy_client: "Policy Client",
  commission_recipient: "Commission Recipient",
  eventuser: "Event User",
  // Pipeline
  pipeline_phase: "Recruits in Phase(s)",
  pipeline_recruiter: "Recruiter",
  pipeline_upline: "Recruit's Upline",
  // Custom
  specific_email: "Specific Email",
  email_list: "Email List",
  dynamic_field: "Dynamic Field",
  // Legacy
  triggeruser: "Trigger User",
  currentuser: "Current User",
  manager: "Manager",
};

// Category groupings for UI
export const RECIPIENT_CATEGORIES = {
  hierarchy: {
    label: "Hierarchy",
    description: "Based on org structure",
    types: [
      "direct_upline",
      "direct_downline",
      "entire_downline",
      "upline_chain",
    ] as RecipientType[],
  },
  role: {
    label: "Role-Based",
    description: "By user role",
    types: [
      "role",
      "all_agents",
      "all_managers",
      "all_trainers",
      "admins",
    ] as RecipientType[],
  },
  context: {
    label: "Event Context",
    description: "From trigger data",
    types: [
      "policy_agent",
      "policy_client",
      "commission_recipient",
      "eventuser",
    ] as RecipientType[],
  },
  pipeline: {
    label: "Recruiting Pipeline",
    description: "Recruiting system",
    types: [
      "pipeline_phase",
      "pipeline_recruiter",
      "pipeline_upline",
    ] as RecipientType[],
  },
  custom: {
    label: "Custom",
    description: "Manual entry",
    types: ["specific_email", "email_list", "dynamic_field"] as RecipientType[],
  },
} as const;

export type RecipientCategory = keyof typeof RECIPIENT_CATEGORIES;

// Available user roles for role-based recipients
export const AVAILABLE_ROLES = [
  { value: "agent", label: "Agent" },
  { value: "trainer", label: "Trainer" },
  { value: "recruiter", label: "Recruiter" },
  { value: "contracting_manager", label: "Contracting Manager" },
  { value: "view_only", label: "View Only" },
] as const;
