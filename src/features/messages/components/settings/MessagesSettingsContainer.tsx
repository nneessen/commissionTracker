// src/features/messages/components/settings/MessagesSettingsContainer.tsx
// Main settings container with horizontal sub-tabs for messaging preferences

import { useState } from "react";
import { Mail, MessageSquare, Instagram } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailSettingsPanel } from "./EmailSettingsPanel";
import { SlackSettingsPanel } from "./SlackSettingsPanel";
import { InstagramSettingsPanel } from "./InstagramSettingsPanel";

type SettingsTab = "email" | "slack" | "instagram";

interface MessagesSettingsContainerProps {
  showSlack?: boolean;
  showInstagram?: boolean;
}

export function MessagesSettingsContainer({
  showSlack = true,
  showInstagram = true,
}: MessagesSettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("email");

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Messaging Settings
        </h2>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          Configure preferences for each messaging platform
        </p>
      </div>

      {/* Sub-tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SettingsTab)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="h-9 px-4 pt-2 bg-transparent border-b border-zinc-200 dark:border-zinc-800 rounded-none justify-start gap-1">
          <TabsTrigger
            value="email"
            className="h-7 px-3 text-[11px] data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md"
          >
            <Mail className="h-3 w-3 mr-1.5" />
            Email
          </TabsTrigger>
          {showSlack && (
            <TabsTrigger
              value="slack"
              className="h-7 px-3 text-[11px] data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md"
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Slack
            </TabsTrigger>
          )}
          {showInstagram && (
            <TabsTrigger
              value="instagram"
              className="h-7 px-3 text-[11px] data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md"
            >
              <Instagram className="h-3 w-3 mr-1.5" />
              Instagram
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="email" className="h-full mt-0 p-4">
            <EmailSettingsPanel />
          </TabsContent>
          {showSlack && (
            <TabsContent value="slack" className="h-full mt-0 p-4">
              <SlackSettingsPanel />
            </TabsContent>
          )}
          {showInstagram && (
            <TabsContent value="instagram" className="h-full mt-0 p-4">
              <InstagramSettingsPanel />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
