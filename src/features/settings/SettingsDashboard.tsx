// src/features/settings/SettingsDashboard.tsx
import React from "react";
import { User, Settings, Building2, Package, Percent } from "lucide-react";
import { UserProfile } from "./components/UserProfile";
import { CarriersManagement } from "./carriers/CarriersManagement";
import { ProductsManagement } from "./products/ProductsManagement";
import { CommissionRatesManagement } from "./commission-rates/CommissionRatesManagement";
import { ConstantsManagement } from "./ConstantsManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";

export function SettingsDashboard() {
  const { can } = usePermissionCheck();

  // Check if user has admin permission to manage carriers
  const canManageCarriers = can("carriers.manage");

  // Default tab: if admin, show carriers; if regular user, show agents (profile)
  const defaultTab = canManageCarriers ? "carriers" : "agents";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Compact Header - matching Dashboard/Targets pages */}
      <div className="page-header py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Settings
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {canManageCarriers
                ? "Configure carriers, products, rates, and system settings"
                : "Manage your profile and preferences"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue={defaultTab}>
            <TabsList
              className={`grid w-full ${canManageCarriers ? "grid-cols-5" : "grid-cols-1"} mb-3 h-8`}
            >
              {canManageCarriers && (
                <>
                  <TabsTrigger
                    value="carriers"
                    className="flex items-center gap-1.5 text-[11px] h-7"
                  >
                    <Building2 className="h-3 w-3" />
                    Carriers
                  </TabsTrigger>
                  <TabsTrigger
                    value="products"
                    className="flex items-center gap-1.5 text-[11px] h-7"
                  >
                    <Package className="h-3 w-3" />
                    Products
                  </TabsTrigger>
                  <TabsTrigger
                    value="rates"
                    className="flex items-center gap-1.5 text-[11px] h-7"
                  >
                    <Percent className="h-3 w-3" />
                    Rates
                  </TabsTrigger>
                  <TabsTrigger
                    value="constants"
                    className="flex items-center gap-1.5 text-[11px] h-7"
                  >
                    <Settings className="h-3 w-3" />
                    Constants
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger
                value="agents"
                className="flex items-center gap-1.5 text-[11px] h-7"
              >
                <User className="h-3 w-3" />
                Profile
              </TabsTrigger>
            </TabsList>

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
          </Tabs>
        </div>
      </div>
    </div>
  );
}
