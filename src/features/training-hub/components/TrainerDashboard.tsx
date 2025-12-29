// src/features/training-hub/components/TrainerDashboard.tsx
// Dashboard for trainers and contracting managers - landing page with KPIs
// Uses zinc palette per DashboardHome.tsx pattern

import { Link } from "@tanstack/react-router";
import {
  Users,
  Mail,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  UserPlus,
  TrendingDown,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface RecruitStats {
  total: number;
  inProgress: number;
  completed: number;
  dropped: number;
  needsAttention: number;
}

interface RecentRecruit {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  onboarding_status: string | null;
  current_onboarding_phase: string | null;
  updated_at: string | null;
}

export function TrainerDashboard() {
  const { user } = useAuth();

  // Fetch recruit statistics
  const { data: recruitStats, isLoading: statsLoading } =
    useQuery<RecruitStats>({
      queryKey: ["trainer-dashboard-stats"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, onboarding_status, current_onboarding_phase, updated_at")
          .contains("roles", ["recruit"]);

        if (error) throw error;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats: RecruitStats = {
          total: data?.length || 0,
          inProgress:
            data?.filter(
              (r) =>
                r.onboarding_status &&
                !["completed", "dropped"].includes(r.onboarding_status),
            ).length || 0,
          completed:
            data?.filter((r) => r.onboarding_status === "completed").length ||
            0,
          dropped:
            data?.filter((r) => r.onboarding_status === "dropped").length || 0,
          needsAttention:
            data?.filter((r) => {
              // Stale recruits - no update in 7+ days
              if (r.updated_at && new Date(r.updated_at) < oneWeekAgo) {
                if (
                  r.onboarding_status &&
                  !["completed", "dropped"].includes(r.onboarding_status)
                ) {
                  return true;
                }
              }
              return false;
            }).length || 0,
        };

        return stats;
      },
    });

  // Fetch recent recruits
  const { data: recentRecruits, isLoading: recruitsLoading } = useQuery<
    RecentRecruit[]
  >({
    queryKey: ["trainer-dashboard-recent-recruits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "id, first_name, last_name, email, onboarding_status, current_onboarding_phase, updated_at",
        )
        .contains("roles", ["recruit"])
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pending messages count
  const { data: messageStats } = useQuery({
    queryKey: ["trainer-dashboard-messages"],
    queryFn: async () => {
      if (!user?.id) return { unread: 0 };

      const { count, error } = await supabase
        .from("email_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) return { unread: 0 };
      return { unread: count || 0 };
    },
    enabled: !!user?.id,
  });

  // Status colors using zinc palette
  const getStatusBadgeClass = (status: string | null): string => {
    if (!status)
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
    switch (status) {
      case "completed":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
      case "dropped":
        return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300";
    }
  };

  const userName = user?.first_name || "Trainer";

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-3 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto space-y-2.5">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
              <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Welcome back, {userName}
                </h1>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Recruiting pipeline overview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Link to="/messages">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2 border-zinc-200 dark:border-zinc-700"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Messages
                  {messageStats?.unread ? (
                    <Badge className="ml-1 h-4 px-1 text-[9px] bg-red-500 text-white">
                      {messageStats.unread}
                    </Badge>
                  ) : null}
                </Button>
              </Link>
              <Link to="/training-hub">
                <Button size="sm" className="h-7 text-[11px] px-2">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Training Hub
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Total
              </span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {recruitStats?.total || 0}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                In Progress
              </span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {recruitStats?.inProgress || 0}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Completed
              </span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {recruitStats?.completed || 0}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Dropped
              </span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {recruitStats?.dropped || 0}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border-2 border-amber-300 dark:border-amber-600/50 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                Attention
              </span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {recruitStats?.needsAttention || 0}
              </p>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Recent Recruits */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Recent Activity
                </h2>
              </div>
              <Link to="/training-hub">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recruitsLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-3 py-2">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))}
                </>
              ) : recentRecruits && recentRecruits.length > 0 ? (
                recentRecruits.map((recruit) => {
                  const name =
                    recruit.first_name && recruit.last_name
                      ? `${recruit.first_name} ${recruit.last_name}`
                      : recruit.email;
                  const phase =
                    recruit.current_onboarding_phase ||
                    recruit.onboarding_status ||
                    "Not Started";

                  return (
                    <Link
                      key={recruit.id}
                      to="/training-hub"
                      className="flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                            {name}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {recruit.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] h-5 px-1.5 ${getStatusBadgeClass(phase)}`}
                        >
                          {phase.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                          {recruit.updated_at
                            ? formatDistanceToNow(
                                new Date(recruit.updated_at),
                                {
                                  addSuffix: true,
                                },
                              )
                            : "-"}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center">
                  <UserPlus className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-1" />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    No recruits in pipeline yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2.5">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Quick Actions
              </h2>
              <div className="space-y-1.5">
                <Link to="/training-hub" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-8 text-[11px] border-zinc-200 dark:border-zinc-700"
                  >
                    <Users className="h-3.5 w-3.5 mr-2 text-zinc-500 dark:text-zinc-400" />
                    View Recruiting Pipeline
                  </Button>
                </Link>
                <Link to="/messages" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-8 text-[11px] border-zinc-200 dark:border-zinc-700"
                  >
                    <Mail className="h-3.5 w-3.5 mr-2 text-zinc-500 dark:text-zinc-400" />
                    Send Message
                    {messageStats?.unread ? (
                      <Badge className="ml-auto h-4 px-1 text-[9px] bg-red-500 text-white">
                        {messageStats.unread}
                      </Badge>
                    ) : null}
                  </Button>
                </Link>
                <Link to="/training-hub" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-8 text-[11px] border-zinc-200 dark:border-zinc-700"
                  >
                    <GraduationCap className="h-3.5 w-3.5 mr-2 text-zinc-500 dark:text-zinc-400" />
                    Email Templates
                  </Button>
                </Link>
                <Link to="/settings" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-8 text-[11px] border-zinc-200 dark:border-zinc-700"
                  >
                    <Activity className="h-3.5 w-3.5 mr-2 text-zinc-500 dark:text-zinc-400" />
                    My Settings
                  </Button>
                </Link>
              </div>
            </div>

            {/* Conversion Rate */}
            {recruitStats && recruitStats.total > 0 && (
              <div className="bg-emerald-500 dark:bg-emerald-600 rounded-lg p-3 text-white">
                <p className="text-[10px] font-medium opacity-80 uppercase tracking-wide">
                  Conversion Rate
                </p>
                <p className="text-2xl font-bold mt-0.5">
                  {Math.round(
                    (recruitStats.completed / recruitStats.total) * 100,
                  )}
                  %
                </p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {recruitStats.completed} of {recruitStats.total} recruits
                  completed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainerDashboard;
