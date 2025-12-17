// /home/nneessen/projects/commissionTracker/src/services/settings/agentService.ts
// This file is deprecated - use userService.ts instead
// Keeping for backward compatibility

import { userService } from "./userService";

// Re-export userService as agentService for backward compatibility
export const agentService = userService;

// Export AgentService class for backward compatibility
export class AgentService {
  getAll() {
    return userService.getAllUsers();
  }

  getById(id: string) {
    return userService.getById(id);
  }

  getAgentById(id: string) {
    return userService.getById(id);
  }

  create(_data: any) {
    // Users are created through Supabase Auth
    throw new Error("Users must be created through authentication signup");
  }

  update(id: string, data: any) {
    return userService.updateUser(id, data);
  }

  delete(_id: string) {
    // Users cannot be deleted through this service
    throw new Error("Users cannot be deleted through this interface");
  }

  async getAgentContractLevel(userId: string): Promise<number> {
    return userService.getUserContractLevel(userId);
  }
}

export default new AgentService();
