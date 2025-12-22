/**
 * Notifications Settings Page
 *
 * Allows users to manage notification preferences and alert rules.
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, AlertTriangle } from "lucide-react";
import { NotificationPreferencesSection } from "./components/NotificationPreferencesSection";
import { AlertRulesSection } from "./components/AlertRulesSection";

export function NotificationsSettingsPage() {
  const [activeTab, setActiveTab] = useState("preferences");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Notifications & Alerts</h2>
        <p className="text-sm text-muted-foreground">
          Manage how you receive notifications and set up custom alerts
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alert Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="mt-4">
          <NotificationPreferencesSection />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertRulesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
