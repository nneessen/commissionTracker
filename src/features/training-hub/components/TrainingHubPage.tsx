// src/features/training-hub/components/TrainingHubPage.tsx
import { useState, useEffect } from "react";
import {
  Users,
  Mail,
  Zap,
  Activity,
  GraduationCap,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { RecruitingTab } from "./RecruitingTab";
import { ActivityTab } from "./ActivityTab";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import AutomationTab from "./AutomationTab";

type TabView = "recruiting" | "templates" | "automation" | "activity";

const TAB_STORAGE_KEY = "training-hub-active-tab";

export default function TrainingHubPage() {
  // Persist tab selection in localStorage
  const [activeView, setActiveView] = useState<TabView>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && ["recruiting", "templates", "automation", "activity"].includes(saved)) {
      return saved as TabView;
    }
    return "recruiting";
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Persist tab changes
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeView);
  }, [activeView]);

  // Fetch recruits count for stats
  const { data: recruitStats } = useQuery({
    queryKey: ["training-hub-recruit-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, onboarding_status")
        .contains("roles", ["recruit"]);

      if (error) throw error;

      const total = data?.length || 0;
      const inProgress = data?.filter(r =>
        r.onboarding_status &&
        !["completed", "dropped"].includes(r.onboarding_status)
      ).length || 0;
      const completed = data?.filter(r => r.onboarding_status === "completed").length || 0;

      return { total, inProgress, completed };
    },
  });

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
    { id: "recruiting" as TabView, label: "Recruiting Pipeline", icon: Users, count: recruitStats?.inProgress },
    { id: "templates" as TabView, label: "Email Templates", icon: Mail, count: templateStats?.count },
    { id: "automation" as TabView, label: "Automation", icon: Zap },
    { id: "activity" as TabView, label: "Activity", icon: Activity },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="page-header py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Training Hub</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Manage recruiting, automation, and communications
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="ml-1 h-4 px-1 text-[10px]"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeView === "recruiting" && (
              <RecruitingTab searchQuery={searchQuery} />
            )}
            {activeView === "templates" && (
              <EmailTemplatesTab searchQuery={searchQuery} />
            )}
            {activeView === "automation" && (
              <AutomationTab />
            )}
            {activeView === "activity" && (
              <ActivityTab searchQuery={searchQuery} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
