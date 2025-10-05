import React from 'react';
import { PageLayout } from '../../components/layout';
import {
  User,
  Settings,
  Grid3x3
} from 'lucide-react';
import { SettingsCard } from './components/SettingsComponents';
import { CommissionManagement } from './CommissionManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SettingsDashboard() {
  return (
    <PageLayout>
      <div className="dashboard-header">
        <h1>Settings</h1>
        <p>Configure carriers, products, commission rates, and system settings</p>
      </div>

      <div className="dashboard-content">
        <Tabs defaultValue="commissions" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Commission Management
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

          <TabsContent value="commissions" className="mt-0">
            <CommissionManagement />
          </TabsContent>

          <TabsContent value="constants" className="mt-0">
            <SettingsCard title="Constants Management" icon={<Settings size={20} />}>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Constants management features coming soon.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Configure default values, commission rates, and application settings.
                </p>
              </div>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="agents" className="mt-0">
            <SettingsCard title="Agent Settings" icon={<User size={20} />}>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Agent settings management coming soon.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Configure agent-specific settings, permissions, and preferences.
                </p>
              </div>
            </SettingsCard>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}