// src/services/targets/index.ts

export { targetsService } from "./targetsService";
export {
  userTargetsService,
  type UserTargets as UserTargetsSnakeCase,
  type UpdateUserTargetsInput,
} from "./userTargetsService";
export {
  userTargetsRepository,
  type CreateUserTargetsInput,
  type UpdateUserTargetsInput as UpdateUserTargetsCamelCase,
} from "./UserTargetsRepository";
