// src/features/underwriting/hooks/useUnderwritingFeatureFlag.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { underwritingQueryKeys } from "./useHealthConditions";

interface ImoSettings {
  underwriting_wizard_enabled?: boolean;
  [key: string]: unknown;
}

async function checkFeatureEnabled(imoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("imos")
    .select("settings")
    .eq("id", imoId)
    .single();

  if (error) {
    console.error("Failed to check underwriting wizard feature flag:", error);
    return false;
  }

  const settings = (data?.settings as ImoSettings) || {};
  return settings.underwriting_wizard_enabled === true;
}

/**
 * Hook to check if the underwriting wizard feature is enabled for the current user's IMO
 */
export function useUnderwritingFeatureFlag() {
  const { user, loading: userLoading } = useAuth();
  const imoId = user?.imo_id;

  const query = useQuery({
    queryKey: underwritingQueryKeys.featureEnabled(imoId || ""),
    queryFn: () => checkFeatureEnabled(imoId!),
    enabled: !!imoId && !userLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Super admins always have access
  const isSuperAdmin = user?.is_super_admin === true;

  return {
    isEnabled: isSuperAdmin || query.data === true,
    isLoading: userLoading || query.isLoading,
    error: query.error,
    // For super admins, we want to show the feature even if the query fails
    canAccess: isSuperAdmin || query.data === true,
  };
}

/**
 * Hook to check if the current user can manage underwriting settings (guides, decision trees)
 * Only IMO admins and super admins can manage these
 */
export function useCanManageUnderwriting() {
  const { user, loading: isLoading } = useAuth();

  // Check if user is IMO admin or super admin
  const isSuperAdmin = user?.is_super_admin === true;
  const isImoAdmin = user?.is_admin === true;

  return {
    canManage: isSuperAdmin || isImoAdmin,
    isLoading,
    isSuperAdmin,
    isImoAdmin,
  };
}
