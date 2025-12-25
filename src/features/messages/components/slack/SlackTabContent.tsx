// src/features/messages/components/slack/SlackTabContent.tsx

import { useState } from "react";
import {
  MessageSquare,
  Settings,
  CheckCircle2,
  Hash,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSlackIntegration,
  useSlackMessages,
  useSlackMessageStats,
  useConnectSlack,
  usePostLeaderboard,
} from "@/hooks/slack";
import type { SlackNotificationType } from "@/types/slack.types";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  policy_created: "Policy Sales",
  policy_cancelled: "Cancellations",
  policy_renewed: "Renewals",
  daily_leaderboard: "Leaderboard",
  weekly_summary: "Weekly Summary",
  commission_milestone: "Milestones",
  agent_achievement: "Achievements",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  delivered:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  retrying:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export function SlackTabContent() {
  const { data: integration, isLoading: integrationLoading } =
    useSlackIntegration();
  const connectSlack = useConnectSlack();
  const postLeaderboard = usePostLeaderboard();

  const [filterType, setFilterType] = useState<SlackNotificationType | "all">(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch,
  } = useSlackMessages({
    limit: 50,
    notificationType: filterType === "all" ? undefined : filterType,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  const { data: stats } = useSlackMessageStats();

  const handleConnect = async () => {
    try {
      await connectSlack.mutateAsync("/messages");
    } catch {
      toast.error("Failed to connect to Slack");
    }
  };

  const handlePostLeaderboard = async () => {
    try {
      const result = await postLeaderboard.mutateAsync(undefined);
      if (result.ok) {
        toast.success("Leaderboard posted to Slack");
        refetch();
      } else {
        toast.error(`Failed to post leaderboard: ${result.error}`);
      }
    } catch {
      toast.error("Failed to post leaderboard");
    }
  };

  if (integrationLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isConnected = integration?.isConnected;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center max-w-sm px-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Connect Slack
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4">
            Connect your Slack workspace to automatically post policy sales and
            daily leaderboards to your team channels.
          </p>
          <Button
            onClick={handleConnect}
            disabled={connectSlack.isPending}
            className="h-8 text-[11px]"
          >
            {connectSlack.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            )}
            Connect Slack Workspace
          </Button>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3">
            Or configure in{" "}
            <Link
              to="/settings"
              search={{ tab: "integrations" }}
              className="text-blue-500 hover:underline"
            >
              Settings → Integrations
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Connected state - show message history
  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Slack
            </span>
            <Badge
              variant="default"
              className="text-[9px] h-4 px-1.5 bg-green-600"
            >
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
              Connected
            </Badge>
          </div>
          {integration?.team_name && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {integration.team_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 mr-2">
              <span>{stats.sent} sent</span>
              {stats.failed > 0 && (
                <span className="text-red-500">{stats.failed} failed</span>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={handlePostLeaderboard}
            disabled={postLeaderboard.isPending}
          >
            {postLeaderboard.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>Post Leaderboard</>
            )}
          </Button>

          <Link to="/settings" search={{ tab: "integrations" }}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <Select
          value={filterType}
          onValueChange={(v) =>
            setFilterType(v as SlackNotificationType | "all")
          }
        >
          <SelectTrigger className="h-6 w-32 text-[10px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">
              All Types
            </SelectItem>
            <SelectItem value="policy_created" className="text-[10px]">
              Policy Sales
            </SelectItem>
            <SelectItem value="daily_leaderboard" className="text-[10px]">
              Leaderboard
            </SelectItem>
            <SelectItem value="policy_cancelled" className="text-[10px]">
              Cancellations
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-6 w-24 text-[10px]">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">
              All Status
            </SelectItem>
            <SelectItem value="sent" className="text-[10px]">
              Sent
            </SelectItem>
            <SelectItem value="failed" className="text-[10px]">
              Failed
            </SelectItem>
            <SelectItem value="pending" className="text-[10px]">
              Pending
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-auto"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-auto">
        {messagesLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : messagesData?.messages && messagesData.messages.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {messagesData.messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                {/* Channel Icon */}
                <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                  <Hash className="h-3.5 w-3.5 text-zinc-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                      #{message.channel_id.slice(0, 10)}...
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {NOTIFICATION_TYPE_LABELS[message.notification_type] ||
                        message.notification_type}
                    </Badge>
                    <Badge
                      className={`text-[9px] h-4 px-1 ${STATUS_COLORS[message.status]}`}
                    >
                      {message.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                    {message.message_text || "No preview available"}
                  </p>
                  {message.error_message && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      Error: {message.error_message}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-[10px] text-zinc-400 flex-shrink-0">
                  {message.sent_at
                    ? formatDistanceToNow(new Date(message.sent_at), {
                        addSuffix: true,
                      })
                    : message.created_at
                      ? formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })
                      : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              No messages yet
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              Messages will appear here when policies are created
            </p>
          </div>
        )}
      </div>

      {/* Footer with total */}
      {messagesData && messagesData.total > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <span className="text-[10px] text-zinc-500">
            Showing {messagesData.messages.length} of {messagesData.total}{" "}
            messages
          </span>
        </div>
      )}
    </div>
  );
}
