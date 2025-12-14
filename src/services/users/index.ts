// User services barrel export
export {
  userService,
  agentService,
  userApprovalService,
  VALID_CONTRACT_LEVELS,
} from './userService';

export type { UserProfile, ApprovalStats } from './userService';

// Re-export types from user.types.ts for convenience
export type {
  CreateUserProfileData,
  UpdateUserProfileData,
  AgentStatus,
  ApprovalStatus,
  UserProfileRow,
} from '../../types/user.types';

// Legacy type exports - deprecated, use types from user.types.ts
export type {
  CreateUserData,
  UpdateUserData,
} from '../../types/user.types';
