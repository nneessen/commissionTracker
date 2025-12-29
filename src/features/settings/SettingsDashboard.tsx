// src/features/settings/SettingsDashboard.tsx
// Redesigned with zinc palette and compact design patterns

import {
  User,
  Settings,
  Building2,
  Package,
  Percent,
  CreditCard,
  Building,
  Crown,
  ClipboardCheck,
  UserPlus,
  Bell,
  History,
  Link2,
} from "lucide-react";
import { UserProfile } from "./components/UserProfile";
import { CarriersManagement } from "./carriers/CarriersManagement";
import { ProductsManagement } from "./products/ProductsManagement";
import { CommissionRatesManagement } from "./commission-rates/CommissionRatesManagement";
import { ConstantsManagement } from "./ConstantsManagement";
import { BillingTab } from "./billing";
import { ImoManagement } from "./imo";
import { AgencyManagement } from "./agency";
import { AgencyRequestPage } from "./agency-request";
import { JoinRequestPage } from "./join-request";
import { NotificationsSettingsPage } from "./notifications";
import { IntegrationsTab } from "./integrations";
import { AuditTrailPage } from "@/features/audit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";
import { useImo } from "@/hooks/imo";
import { usePendingAgencyRequestCount } from "@/hooks/agency-request";
import { usePendingJoinApprovalCount } from "@/hooks/join-request";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { RoleName } from "@/types/permissions.types";

export function SettingsDashboard() {
  const { can } = usePermissionCheck();
  const { isSuperAdmin, isImoAdmin, loading: _imoLoading } = useImo();
  const { user } = useAuth();
  const { data: pendingAgencyRequestCount = 0 } =
    usePendingAgencyRequestCount();
  const { data: pendingJoinRequestCount = 0 } = usePendingJoinApprovalCount();

  // Check user roles to determine if they are staff-only
  const { data: userProfile } = useQuery({
    queryKey: ["settings-user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("roles, is_admin")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as { roles: RoleName[]; is_admin: boolean | null };
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: RoleName) =>
    userProfile?.roles?.includes(role) || false;

  // Staff-only: has trainer/contracting_manager but NOT agent/admin
  const isStaffOnly =
    (hasRole("trainer" as RoleName) ||
      hasRole("contracting_manager" as RoleName)) &&
    !hasRole("agent" as RoleName) &&
    !hasRole("admin" as RoleName) &&
    !userProfile?.is_admin;

  // Check if user has admin permission to manage carriers
  const canManageCarriers = can("carriers.manage");

  // Check organization management permissions
  const canManageImos = isSuperAdmin;
  const canManageAgencies = isImoAdmin || isSuperAdmin;
  const canViewAuditTrail = isImoAdmin || isSuperAdmin;

  // Default tab: prioritize IMO management for super admins
  const defaultTab = canManageImos
    ? "imos"
    : canManageAgencies
      ? "agencies"
      : canManageCarriers
        ? "carriers"
        : "agents";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h1>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {canManageCarriers
            ? "Configure carriers, products, commission rates, and system settings"
            : "Manage your profile and preferences"}
        </p>
      </div>

      {/* Content area with tabs */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs
          defaultValue={defaultTab}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Compact tabs - single row */}
          <TabsList className="flex items-center gap-0 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5 h-auto w-full">
            {/* Organization Management tabs - Super Admin / IMO Admin */}
            {canManageImos && (
              <TabsTrigger
                value="imos"
                className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Crown className="h-3 w-3 shrink-0" />
                <span className="truncate">IMOs</span>
              </TabsTrigger>
            )}
            {canManageAgencies && (
              <TabsTrigger
                value="agencies"
                className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Building className="h-3 w-3 shrink-0" />
                <span className="truncate">Agencies</span>
              </TabsTrigger>
            )}
            {/* Admin tabs */}
            {canManageCarriers && (
              <>
                <TabsTrigger
                  value="carriers"
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">Carriers</span>
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Package className="h-3 w-3 shrink-0" />
                  <span className="truncate">Products</span>
                </TabsTrigger>
                <TabsTrigger
                  value="rates"
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Percent className="h-3 w-3 shrink-0" />
                  <span className="truncate">Rates</span>
                </TabsTrigger>
                <TabsTrigger
                  value="constants"
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Settings className="h-3 w-3 shrink-0" />
                  <span className="truncate">Constants</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="agents"
              className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">Integrations</span>
            </TabsTrigger>
            <TabsTrigger
              value="agency-request"
              className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ClipboardCheck className="h-3 w-3 shrink-0" />
              <span className="truncate">Agency</span>
              {pendingAgencyRequestCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-3.5 px-1 text-[9px] min-w-0"
                >
                  {pendingAgencyRequestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="join-request"
              className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <UserPlus className="h-3 w-3 shrink-0" />
              <span className="truncate">Join</span>
              {pendingJoinRequestCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-3.5 px-1 text-[9px] min-w-0"
                >
                  {pendingJoinRequestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <Bell className="h-3 w-3 shrink-0" />
              <span className="truncate">Alerts</span>
            </TabsTrigger>
            {canViewAuditTrail && (
              <TabsTrigger
                value="audit-trail"
                className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <History className="h-3 w-3 shrink-0" />
                <span className="truncate">Audit</span>
              </TabsTrigger>
            )}
            {!isStaffOnly && (
              <TabsTrigger
                value="billing"
                className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <CreditCard className="h-3 w-3 shrink-0" />
                <span className="truncate">Billing</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto mt-2">
            {/* Organization Management content */}
            {canManageImos && (
              <TabsContent value="imos" className="mt-0">
                <ImoManagement />
              </TabsContent>
            )}

            {canManageAgencies && (
              <TabsContent value="agencies" className="mt-0">
                <AgencyManagement />
              </TabsContent>
            )}

            {/* Admin content */}
            {canManageCarriers && (
              <>
                <TabsContent value="carriers" className="mt-0">
                  <CarriersManagement />
                </TabsContent>

                <TabsContent value="products" className="mt-0">
                  <ProductsManagement />
                </TabsContent>

                <TabsContent value="rates" className="mt-0">
                  <CommissionRatesManagement />
                </TabsContent>

                <TabsContent value="constants" className="mt-0">
                  <ConstantsManagement />
                </TabsContent>
              </>
            )}

            <TabsContent value="agents" className="mt-0">
              <UserProfile />
            </TabsContent>

            <TabsContent value="integrations" className="mt-0">
              <IntegrationsTab />
            </TabsContent>

            <TabsContent value="agency-request" className="mt-0">
              <AgencyRequestPage />
            </TabsContent>

            <TabsContent value="join-request" className="mt-0">
              <JoinRequestPage />
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <NotificationsSettingsPage />
            </TabsContent>

            {canViewAuditTrail && (
              <TabsContent value="audit-trail" className="mt-0">
                <AuditTrailPage />
              </TabsContent>
            )}

            {!isStaffOnly && (
              <TabsContent value="billing" className="mt-0">
                <BillingTab />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
