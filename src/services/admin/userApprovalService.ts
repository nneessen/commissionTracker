// /home/nneessen/projects/commissionTracker/src/services/admin/userApprovalService.ts
// DEPRECATED: This file is maintained for backward compatibility only.
// All functionality has been moved to src/services/users/userService.ts

// Re-export everything from userService for backward compatibility
export {
  userService as userApprovalService,
  type UserProfile,
  type ApprovalStats,
  VALID_CONTRACT_LEVELS
} from '../users/userService';