// src/services/agents/agentService.ts
// DEPRECATED: This file is maintained for backward compatibility only.
// All functionality has been moved to src/services/users/userService.ts
// Please use userService instead of agentService in new code.

// Re-export everything from the new userService
export { userService as agentService } from '../users/userService';
export type { CreateUserData as CreateAgentData, UpdateUserData as UpdateAgentData } from '../../types/user.types';