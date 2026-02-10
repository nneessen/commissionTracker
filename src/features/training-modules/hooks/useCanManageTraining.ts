// src/features/training-modules/hooks/useCanManageTraining.ts
import { useAuth } from "@/contexts/AuthContext";
import { STAFF_ONLY_ROLES } from "@/constants/roles";

/**
 * Returns true if the current user can manage training modules.
 * Allowed: super_admin, admin role, trainer, contracting_manager
 */
export function useCanManageTraining(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.is_super_admin) return true;
  if (user.is_admin) return true;

  const roles = user.roles as string[] | undefined;
  if (!roles) return false;

  return (
    roles.includes("admin") ||
    STAFF_ONLY_ROLES.some((r) => roles.includes(r))
  );
}
