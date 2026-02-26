// src/features/chat-bot/ChatBotPage.tsx
// Main page with tab layout for AI Chat Bot management

import { useState, useCallback } from "react";
import {
  Bot,
  Settings,
  MessageSquare,
  Calendar,
  Activity,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChatBotAgent, type ChatBotAgent } from "./hooks/useChatBot";
import { useUserActiveAddons } from "@/hooks/subscription";
import { ChatBotLanding } from "./components/ChatBotLanding";
import { SetupWizard } from "./components/SetupWizard";
import { SetupTab } from "./components/SetupTab";
import { ConversationsTab } from "./components/ConversationsTab";
import { AppointmentsTab } from "./components/AppointmentsTab";
import { UsageTab } from "./components/UsageTab";

type TabId = "setup" | "conversations" | "appointments" | "usage";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "setup", label: "Setup", icon: Settings },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "usage", label: "Usage", icon: Activity },
];

function isSetupComplete(agent: ChatBotAgent): boolean {
  const closeConnected = agent.connections?.close?.connected || false;
  const calendlyConnected = agent.connections?.calendly?.connected || false;
  const hasLeadSources = (agent.autoOutreachLeadSources?.length ?? 0) > 0;
  const hasLeadStatuses = (agent.allowedLeadStatuses?.length ?? 0) > 0;
  return (
    closeConnected && calendlyConnected && hasLeadSources && hasLeadStatuses
  );
}

function getWizardDoneKey(agentId: string): string {
  return `chatbot_wizard_done_${agentId}`;
}

export function ChatBotPage() {
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const { activeAddons, isLoading: addonsLoading } = useUserActiveAddons();
  const hasAddon = activeAddons.some((a) => a.addon?.name === "ai_chat_bot");
  const { data: agent, isLoading: agentLoading } = useChatBotAgent(hasAddon);

  const isLoading = addonsLoading || (hasAddon && agentLoading);

  // Check if wizard was completed (persisted in localStorage)
  const wizardDone = agent
    ? localStorage.getItem(getWizardDoneKey(agent.id)) === "true"
    : false;

  const setupComplete = agent ? isSetupComplete(agent) : false;

  const handleWizardComplete = useCallback(() => {
    if (agent) {
      localStorage.setItem(getWizardDoneKey(agent.id), "true");
      // Force re-render by setting state
      window.location.reload();
    }
  }, [agent]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  // State 1: No addon — show landing page
  if (!hasAddon || !agent) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800 mb-2.5">
          <Bot className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Chat Bot
          </h1>
        </div>

        {/* Landing content */}
        <div className="flex-1 overflow-y-auto">
          <ChatBotLanding />
        </div>
      </div>
    );
  }

  // State 2: Addon active but setup not complete and wizard not done — show wizard
  if (!setupComplete && !wizardDone) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800 mb-2.5">
          <Bot className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Chat Bot
          </h1>
          <Badge className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            Setup Required
          </Badge>
        </div>

        {/* Wizard */}
        <div className="flex-1 overflow-y-auto">
          <SetupWizard agent={agent} onComplete={handleWizardComplete} />
        </div>
      </div>
    );
  }

  // State 3: Addon active + setup complete (or wizard done) — show tabbed dashboard
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Chat Bot
          </h1>
          {agent.botEnabled ? (
            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              Active
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-[9px] h-4 px-1.5 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
              activeTab === tab.id
                ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            <tab.icon className="h-3 w-3" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "setup" && <SetupTab />}
        {activeTab === "conversations" && <ConversationsTab />}
        {activeTab === "appointments" && <AppointmentsTab />}
        {activeTab === "usage" && <UsageTab />}
      </div>
    </div>
  );
}
