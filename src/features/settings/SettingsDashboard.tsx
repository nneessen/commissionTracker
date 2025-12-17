// src/features/settings/SettingsDashboard.tsx
// Redesigned with zinc palette and compact design patterns

import { User, Settings, Building2, Package, Percent, Mail } from 'lucide-react';
import { UserProfile } from './components/UserProfile';
import { CarriersManagement } from './carriers/CarriersManagement';
import { ProductsManagement } from './products/ProductsManagement';
import { CommissionRatesManagement } from './commission-rates/CommissionRatesManagement';
import { ConstantsManagement } from './ConstantsManagement';
import { EmailConnectionManager } from '@/features/email';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissionCheck } from '@/hooks/permissions/usePermissions';

export function SettingsDashboard() {
  const { can } = usePermissionCheck();

  // Check if user has admin permission to manage carriers
  const canManageCarriers = can('carriers.manage');

  // Default tab: if admin, show carriers; if regular user, show agents (profile)
  const defaultTab = canManageCarriers ? 'carriers' : 'agents';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {canManageCarriers
            ? 'Configure carriers, products, commission rates, and system settings'
            : 'Manage your profile and preferences'}
        </p>
      </div>

      {/* Content area with tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1">
          {/* Compact tabs */}
          <TabsList className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5 h-auto w-full">
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
              {canManageCarriers ? 'Agents' : 'Profile'}
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* Tab content */}
          <div className="flex-1 overflow-auto mt-2">
            {canManageCarriers && (
              <>
                <TabsContent value="carriers" className="mt-0 h-full">
                  <CarriersManagement />
                </TabsContent>

                <TabsContent value="products" className="mt-0 h-full">
                  <ProductsManagement />
                </TabsContent>

                <TabsContent value="rates" className="mt-0 h-full">
                  <CommissionRatesManagement />
                </TabsContent>

                <TabsContent value="constants" className="mt-0 h-full">
                  <ConstantsManagement />
                </TabsContent>
              </>
            )}

            <TabsContent value="agents" className="mt-0 h-full">
              <UserProfile />
            </TabsContent>

            <TabsContent value="email" className="mt-0 h-full">
              <EmailConnectionManager />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
