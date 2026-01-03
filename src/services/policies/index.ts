// src/services/policies/index.ts
export { PolicyRepository } from "./PolicyRepository";
export { PolicyService, policyService } from "./policyService";

// Export singleton repository instance for direct access to batch methods
import { PolicyRepository } from "./PolicyRepository";
export const policyRepository = new PolicyRepository();
