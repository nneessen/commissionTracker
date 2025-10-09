import React from 'react';
import { PageLayout } from '../../components/layout';
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

export function SettingsDashboard() {
  return (
    <PageLayout>
      <div className="dashboard-header">
        <h1>Settings</h1>
        <p>Configure carriers, products, commission rates, and system settings</p>
      </div>

      <div className="dashboard-content">
        <Tabs defaultValue="carriers" className="mt-6">
          <TabsList className="grid w-full grid-cols-5 mb-8">
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
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Agents
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="agents" className="mt-0">
            <UserProfile />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}