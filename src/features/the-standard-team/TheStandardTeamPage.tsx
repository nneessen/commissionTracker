// src/features/the-standard-team/TheStandardTeamPage.tsx
// The Standard Team Management - Writing Numbers and State Licenses

import { useState, useEffect } from "react";
import { Users, FileText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { WritingNumbersTab } from "./components/WritingNumbersTab";
import { StateLicensesTab } from "./components/StateLicensesTab";
import { useTheStandardAgents } from "./hooks/useTheStandardAgents";

type TabType = "writing-numbers" | "state-licenses";

interface TheStandardTeamPageProps {
  initialTab?: string;
}

export function TheStandardTeamPage({ initialTab }: TheStandardTeamPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab === "state-licenses" ? "state-licenses" : "writing-numbers",
  );

  // Get agent count for header stats
  const { data: agents = [] } = useTheStandardAgents();

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: typeof FileText }[] = [
    { id: "writing-numbers", label: "Carrier Writing Numbers", icon: FileText },
    { id: "state-licenses", label: "State Licenses", icon: MapPin },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              The Standard Team
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {agents.length}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">agents</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Manage carrier assignments and state licenses
        </div>
      </div>

      {/* Compact tabs */}
      <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-md p-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
                isActive
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-auto">
          {activeTab === "writing-numbers" && <WritingNumbersTab />}
          {activeTab === "state-licenses" && <StateLicensesTab />}
        </div>
      </div>
    </div>
  );
}
