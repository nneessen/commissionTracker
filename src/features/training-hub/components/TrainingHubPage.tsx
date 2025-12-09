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
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 space-y-3">
      {/* Header with inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Training Hub</h1>
          </div>

          {/* Compact inline stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{recruitStats?.inProgress || 0}</span>
              <span>active recruits</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{recruitStats?.completed || 0}</span>
              <span>graduated</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{templateStats?.count || 0}</span>
              <span>templates</span>
            </div>
          </div>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 h-8 text-sm"
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 gap-1.5 ${isActive ? "bg-background shadow-sm" : ""}`}
              onClick={() => setActiveView(tab.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {tab.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden border rounded-lg bg-card">
        {activeView === "recruiting" && (
          <RecruitingTab searchQuery={searchQuery} />
        )}

        {activeView === "templates" && (
          <div className="flex-1 overflow-auto p-4">
            <EmailTemplatesTab searchQuery={searchQuery} />
          </div>
        )}

        {activeView === "automation" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Automation Workflows</p>
              <p className="text-xs mt-1 text-muted-foreground">Configure automated emails and notifications based on pipeline events</p>
              <p className="text-xs mt-4 text-muted-foreground">Coming in Phase 4</p>
            </div>
          </div>
        )}

        {activeView === "activity" && (
          <ActivityTab searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}
