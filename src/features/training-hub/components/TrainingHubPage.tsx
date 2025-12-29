// src/features/training-hub/components/TrainingHubPage.tsx
// Training Hub for trainers and contracting managers
// Note: Recruit pipeline management is now via the main /recruiting page
import { useState, useEffect } from "react";
import { Mail, Zap, Activity, Search, X, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { ActivityTab } from "./ActivityTab";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import AutomationTab from "./AutomationTab";

type TabView = "templates" | "automation" | "activity";

const TAB_STORAGE_KEY = "training-hub-active-tab";

export default function TrainingHubPage() {
  // Persist tab selection in localStorage
  const [activeView, setActiveView] = useState<TabView>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && ["templates", "automation", "activity"].includes(saved)) {
      return saved as TabView;
    }
    return "templates";
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Persist tab changes
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeView);
  }, [activeView]);

  // Fetch email templates count
  const { data: templateStats } = useQuery({
    queryKey: ["training-hub-template-stats"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_templates")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (error) throw error;
      return { count: count || 0 };
    },
  });

  const tabs = [
    {
      id: "templates" as TabView,
      label: "Email Templates",
      icon: Mail,
      count: templateStats?.count,
    },
    { id: "automation" as TabView, label: "Automation", icon: Zap },
    { id: "activity" as TabView, label: "Activity", icon: Activity },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Training Hub
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {templateStats?.count || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                templates
              </span>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-56">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 pr-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Compact tabs */}
      <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all ${
                isActive
                  ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant="secondary"
                  className={`ml-1 h-4 px-1 text-[10px] ${
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                      : "bg-zinc-300/50 dark:bg-zinc-700/50"
                  }`}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {activeView === "templates" && (
          <EmailTemplatesTab searchQuery={searchQuery} />
        )}
        {activeView === "automation" && <AutomationTab />}
        {activeView === "activity" && <ActivityTab searchQuery={searchQuery} />}
      </div>
    </div>
  );
}
