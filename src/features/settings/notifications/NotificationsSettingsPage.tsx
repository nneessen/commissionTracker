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
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-zinc-400" />
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Notifications & Alerts
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Manage notifications and custom alerts
            </p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-xs h-7">
            <TabsTrigger value="preferences" className="text-[10px] h-6 gap-1">
              <Bell className="h-3 w-3" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-[10px] h-6 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Alert Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="mt-3">
            <NotificationPreferencesSection />
          </TabsContent>

          <TabsContent value="alerts" className="mt-3">
            <AlertRulesSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
