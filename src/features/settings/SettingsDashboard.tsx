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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";
import { useImo } from "@/hooks/imo";
import { usePendingAgencyRequestCount } from "@/hooks/agency-request";
import { usePendingJoinApprovalCount } from "@/hooks/join-request";

export function SettingsDashboard() {
  const { can } = usePermissionCheck();
  const { isSuperAdmin, isImoAdmin, loading: imoLoading } = useImo();
  const { data: pendingAgencyRequestCount = 0 } = usePendingAgencyRequestCount();
  const { data: pendingJoinRequestCount = 0 } = usePendingJoinApprovalCount();

  // Check if user has admin permission to manage carriers
  const canManageCarriers = can("carriers.manage");

  // Check organization management permissions
  const canManageImos = isSuperAdmin;
  const canManageAgencies = isImoAdmin || isSuperAdmin;

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
          {/* Compact tabs */}
          <TabsList className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5 h-auto w-full flex-wrap">
            {/* Organization Management tabs - Super Admin / IMO Admin */}
            {canManageImos && (
              <TabsTrigger
                value="imos"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Crown className="h-3.5 w-3.5" />
                IMOs
              </TabsTrigger>
            )}
            {canManageAgencies && (
              <TabsTrigger
                value="agencies"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Building className="h-3.5 w-3.5" />
                Agencies
              </TabsTrigger>
            )}
            {/* Admin tabs */}
            {canManageCarriers && (
              <>
                <TabsTrigger
                  value="carriers"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Carriers
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Package className="h-3.5 w-3.5" />
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="rates"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Percent className="h-3.5 w-3.5" />
                  Commission Rates
                </TabsTrigger>
                <TabsTrigger
                  value="constants"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Constants
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="agents"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <User className="h-3.5 w-3.5" />
              {canManageCarriers ? "Agents" : "Profile"}
            </TabsTrigger>
            <TabsTrigger
              value="agency-request"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Agency
              {pendingAgencyRequestCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {pendingAgencyRequestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="join-request"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Join
              {pendingJoinRequestCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {pendingJoinRequestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Billing
            </TabsTrigger>
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

            <TabsContent value="agency-request" className="mt-0">
              <AgencyRequestPage />
            </TabsContent>

            <TabsContent value="join-request" className="mt-0">
              <JoinRequestPage />
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <NotificationsSettingsPage />
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <BillingTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
