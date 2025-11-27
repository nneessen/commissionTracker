import React from 'react';
import {
  User,
  Settings,
  Building2,
  Package,
  Percent
} from 'lucide-react';
import { SettingsCard } from './components/SettingsComponents';
import { UserProfile } from './components/UserProfile';
import { CarriersManagement } from './carriers/CarriersManagement';
import { ProductsManagement } from './products/ProductsManagement';
import { CommissionRatesManagement } from './commission-rates/CommissionRatesManagement';
import { ConstantsManagement } from './ConstantsManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissionCheck } from '@/hooks/permissions/usePermissions';

export function SettingsDashboard() {
  const { can } = usePermissionCheck();

  // Check if user has admin permission to manage carriers
  const canManageCarriers = can('carriers.manage');

  // Default tab: if admin, show carriers; if regular user, show agents (profile)
  const defaultTab = canManageCarriers ? 'carriers' : 'agents';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          {canManageCarriers
            ? 'Configure carriers, products, commission rates, and system settings'
            : 'Manage your profile and preferences'}
        </p>
      </div>

      <div className="page-content">
        <Tabs defaultValue={defaultTab} className="mt-6">
          <TabsList className={`grid w-full ${canManageCarriers ? 'grid-cols-5' : 'grid-cols-1'} mb-8`}>
            {canManageCarriers && (
              <>
                <TabsTrigger value="carriers" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Carriers
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="rates" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Commission Rates
                </TabsTrigger>
                <TabsTrigger value="constants" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Constants
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {canManageCarriers ? 'Agents' : 'Profile'}
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
                <SettingsCard title="Constants Management" icon={<Settings size={20} />}>
                  <ConstantsManagement />
                </SettingsCard>
              </TabsContent>
            </>
          )}

          <TabsContent value="agents" className="mt-0">
            <UserProfile />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}