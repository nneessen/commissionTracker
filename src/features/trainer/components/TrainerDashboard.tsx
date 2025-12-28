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
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Trainer Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              {imo ? `${imo.name} Training Overview` : "Training Overview"}
            </p>
          </div>
        </div>
        <Link to="/training-hub">
          <Button variant="outline" size="sm">
            <GraduationCap className="h-4 w-4 mr-2" />
            Training Hub
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : recruitStats?.total || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Recruits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : recruitStats?.inProgress || 0}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : recruitStats?.completed || 0}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : recruitStats?.dropped || 0}
                </p>
                <p className="text-xs text-muted-foreground">Dropped</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Pipeline Breakdown */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline by Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {recruitStats?.byPhase &&
            Object.keys(recruitStats.byPhase).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(recruitStats.byPhase)
                  .sort((a, b) => b[1] - a[1])
                  .map(([phase, count]) => (
                    <div
                      key={phase}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getPhaseColor(phase)}`}
                        />
                        <span className="text-sm">
                          {formatPhaseLabel(phase)}
                        </span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No recruits in pipeline
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recent Recruit Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {recentRecruits && recentRecruits.length > 0 ? (
              <div className="space-y-2">
                {recentRecruits.map((recruit) => (
                  <div
                    key={recruit.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {recruit.first_name} {recruit.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {recruit.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {recruit.onboarding_status
                        ? formatPhaseLabel(recruit.onboarding_status)
                        : "New"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to="/training-hub" className="flex-1">
          <Button variant="outline" className="w-full h-12">
            <GraduationCap className="h-4 w-4 mr-2" />
            Manage Training Pipeline
          </Button>
        </Link>
        <Link to="/messages" className="flex-1">
          <Button variant="outline" className="w-full h-12">
            <Mail className="h-4 w-4 mr-2" />
            Communications Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default TrainerDashboard;
