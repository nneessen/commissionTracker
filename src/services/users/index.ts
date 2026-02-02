// src/services/users/index.ts
// User services barrel export

// Repository
export { UserRepository } from "./UserRepository";
export type { UserBaseEntity, UserFilters } from "./UserRepository";

// Service
export {
  userService,
  userApprovalService,
  VALID_CONTRACT_LEVELS,
} from "./userService";

export type { UserProfile, ApprovalStats } from "./userService";

// Re-export types from user.types.ts for convenience
export type {
  CreateUserProfileData,
  UpdateUserProfileData,
  AgentStatus,
  ApprovalStatus,
  UserProfileRow,
} from "../../types/user.types";

// User search
export {
  searchUsersForAssignment,
  getUserDisplayName,
} from "./userSearchService";
export type {
  UserSearchResult,
  SearchUsersParams,
} from "./userSearchService";
