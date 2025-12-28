// src/features/trainer/components/TrainerDashboard.tsx
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  GraduationCap,
  TrendingUp,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";

interface RecruitStats {
  total: number;
  inProgress: number;
  completed: number;
  dropped: number;
  byPhase: Record<string, number>;
}

interface RecentRecruit {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  onboarding_status: string | null;
  updated_at: string | null;
}

export function TrainerDashboard() {
  const { user } = useAuth();
  const { imo } = useImo();

  // Fetch recruiting stats for the trainer's IMO
  const { data: recruitStats, isLoading: statsLoading } = useQuery({
    queryKey: ["trainer-dashboard-stats", imo?.id],
    queryFn: async (): Promise<RecruitStats> => {
      let query = supabase
        .from("user_profiles")
        .select("id, onboarding_status, roles")
        .contains("roles", ["recruit"]);

      // Filter by IMO if the trainer has one
      if (imo?.id) {
        query = query.eq("imo_id", imo.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const recruits = data || [];
      const total = recruits.length;
      const inProgress = recruits.filter(
        (r) =>
          r.onboarding_status &&
          !["completed", "dropped"].includes(r.onboarding_status),
      ).length;
      const completed = recruits.filter(
        (r) => r.onboarding_status === "completed",
      ).length;
      const dropped = recruits.filter(
        (r) => r.onboarding_status === "dropped",
      ).length;

      // Count by phase
      const byPhase: Record<string, number> = {};
      recruits.forEach((r) => {
        if (
          r.onboarding_status &&
          r.onboarding_status !== "completed" &&
          r.onboarding_status !== "dropped"
        ) {
          byPhase[r.onboarding_status] =
            (byPhase[r.onboarding_status] || 0) + 1;
        }
      });

      return { total, inProgress, completed, dropped, byPhase };
    },
    enabled: !!user?.id,
  });

  // Fetch recent recruit activity
  const { data: recentRecruits } = useQuery({
    queryKey: ["trainer-dashboard-recent", imo?.id],
    queryFn: async (): Promise<RecentRecruit[]> => {
      let query = supabase
        .from("user_profiles")
        .select(
          "id, first_name, last_name, email, onboarding_status, updated_at",
        )
        .contains("roles", ["recruit"])
        .order("updated_at", { ascending: false })
        .limit(5);

      if (imo?.id) {
        query = query.eq("imo_id", imo.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RecentRecruit[];
    },
    enabled: !!user?.id,
  });

  const formatPhaseLabel = (phase: string): string => {
    return phase
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getPhaseColor = (phase: string): string => {
    const colors: Record<string, string> = {
      prospect: "bg-gray-500",
      interview_1: "bg-blue-500",
      zoom_interview: "bg-blue-600",
      pre_licensing: "bg-yellow-500",
      exam: "bg-orange-500",
      npn_received: "bg-green-500",
      contracting: "bg-purple-500",
      bootcamp: "bg-indigo-500",
    };
    return colors[phase] || "bg-gray-400";
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950 overflow-auto">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Trainer Dashboard
            </h1>
            {imo && (
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {imo.name}
              </span>
            )}
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {statsLoading ? "..." : recruitStats?.total || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">total</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {statsLoading ? "..." : recruitStats?.inProgress || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">active</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-emerald-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {statsLoading ? "..." : recruitStats?.completed || 0}
              </span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <UserX className="h-3 w-3 text-red-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {statsLoading ? "..." : recruitStats?.dropped || 0}
              </span>
            </div>
          </div>
        </div>

        <Link to="/training-hub">
          <Button
            variant="outline"
            className="h-6 text-[10px] px-2 border-zinc-200 dark:border-zinc-700"
          >
            <GraduationCap className="h-3 w-3 mr-1" />
            Training Hub
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-2.5 flex-1 min-h-0">
        {/* Pipeline Breakdown */}
        <Card className="flex flex-col bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <CardTitle className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Pipeline by Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto px-3 pb-2">
            {recruitStats?.byPhase &&
            Object.keys(recruitStats.byPhase).length > 0 ? (
              <div className="space-y-1.5">
                {Object.entries(recruitStats.byPhase)
                  .sort((a, b) => b[1] - a[1])
                  .map(([phase, count]) => (
                    <div
                      key={phase}
                      className="flex items-center justify-between py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${getPhaseColor(phase)}`}
                        />
                        <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          {formatPhaseLabel(phase)}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 text-[10px]"
                      >
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-zinc-500 dark:text-zinc-400 text-[11px]">
                No recruits in pipeline
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="flex flex-col bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <CardTitle className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Recent Recruit Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto px-3 pb-2">
            {recentRecruits && recentRecruits.length > 0 ? (
              <div className="space-y-1.5">
                {recentRecruits.map((recruit) => (
                  <div
                    key={recruit.id}
                    className="flex items-center justify-between py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {recruit.first_name} {recruit.last_name}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        {recruit.email}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="ml-2 shrink-0 h-4 px-1.5 text-[10px] border-zinc-200 dark:border-zinc-700"
                    >
                      {recruit.onboarding_status
                        ? formatPhaseLabel(recruit.onboarding_status)
                        : "New"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-zinc-500 dark:text-zinc-400 text-[11px]">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link to="/training-hub" className="flex-1">
          <Button
            variant="outline"
            className="w-full h-8 text-[11px] border-zinc-200 dark:border-zinc-700"
          >
            <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
            Manage Training Pipeline
          </Button>
        </Link>
        <Link to="/messages" className="flex-1">
          <Button
            variant="outline"
            className="w-full h-8 text-[11px] border-zinc-200 dark:border-zinc-700"
          >
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Communications Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default TrainerDashboard;
