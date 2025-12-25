// src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx

import { useState, useMemo } from "react";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSlackIntegration,
  useConnectSlack,
  useDisconnectSlack,
  useTestSlackConnection,
  useSlackChannels,
  useUpdateSlackChannelSettings,
  useJoinSlackChannel,
} from "@/hooks/slack";
import { toast } from "sonner";
import type { SlackChannel } from "@/types/slack.types";

export function SlackIntegrationCard() {
  const { data: integration, isLoading } = useSlackIntegration();
  const { data: channels = [], isLoading: channelsLoading } =
    useSlackChannels();
  const connectSlack = useConnectSlack();
  const disconnectSlack = useDisconnectSlack();
  const testConnection = useTestSlackConnection();
  const updateSettings = useUpdateSlackChannelSettings();
  const joinChannel = useJoinSlackChannel();

  const [showSettings, setShowSettings] = useState(false);

  // Filter to only show channels the bot is a member of
  const availableChannels = useMemo(() => {
    return channels.filter((c: SlackChannel) => c.is_member && !c.is_archived);
  }, [channels]);

  const handleConnect = async () => {
    try {
      await connectSlack.mutateAsync("/settings/integrations");
    } catch (_error) {
      toast.error("Failed to initiate Slack connection");
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect Slack? This will stop all Slack notifications.",
      )
    ) {
      return;
    }
    try {
      await disconnectSlack.mutateAsync();
      toast.success("Slack disconnected");
    } catch {
      toast.error("Failed to disconnect Slack");
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result.ok) {
        toast.success("Slack connection is working");
      } else {
        toast.error(`Connection test failed: ${result.error}`);
      }
    } catch {
      toast.error("Failed to test connection");
    }
  };

  const handleChannelSelect = async (
    type: "policy" | "leaderboard",
    channelId: string,
  ) => {
    const channel = channels.find((c: SlackChannel) => c.id === channelId);
    if (!channel) return;

    // If bot is not a member, try to join first
    if (!channel.is_member) {
      try {
        const result = await joinChannel.mutateAsync(channelId);
        if (!result.ok) {
          toast.error(`Cannot join channel: ${result.error}`);
          return;
        }
      } catch {
        toast.error("Failed to join channel");
        return;
      }
    }

    try {
      if (type === "policy") {
        await updateSettings.mutateAsync({
          policy_channel_id: channelId,
          policy_channel_name: channel.name,
        });
        toast.success(`Policy notifications will go to #${channel.name}`);
      } else {
        await updateSettings.mutateAsync({
          leaderboard_channel_id: channelId,
          leaderboard_channel_name: channel.name,
        });
        toast.success(`Leaderboard will go to #${channel.name}`);
      }
    } catch {
      toast.error("Failed to update channel setting");
    }
  };

  const handleToggleSetting = async (
    setting: "include_client_info" | "include_leaderboard_with_policy",
    value: boolean,
  ) => {
    try {
      await updateSettings.mutateAsync({ [setting]: value });
    } catch {
      toast.error("Failed to update setting");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isConnected = integration?.isConnected;

  return (
    <div className="space-y-3">
      {/* Main Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Slack
              </h3>
              {isConnected ? (
                <Badge
                  variant="default"
                  className="text-[9px] h-4 px-1.5 bg-green-600"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  <XCircle className="h-2.5 w-2.5 mr-0.5" />
                  Not Connected
                </Badge>
              )}
            </div>

            {isConnected && integration?.team_name && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Workspace: {integration.team_name}
              </p>
            )}

            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {isConnected
                ? "Automatically post policy sales and leaderboards to Slack channels."
                : "Connect your Slack workspace to enable automated notifications."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <ChevronDown
                    className={`h-3 w-3 mr-1 transition-transform ${showSettings ? "rotate-180" : ""}`}
                  />
                  {showSettings ? "Hide" : "Settings"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={handleTestConnection}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-red-500 hover:text-red-600"
                  onClick={handleDisconnect}
                  disabled={disconnectSlack.isPending}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-7 px-3 text-[10px]"
                onClick={handleConnect}
                disabled={connectSlack.isPending}
              >
                {connectSlack.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <MessageSquare className="h-3 w-3 mr-1" />
                )}
                Connect Slack
              </Button>
            )}
          </div>
        </div>

        {/* Connection Error */}
        {integration?.connection_status === "error" &&
          integration.last_error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-[10px] text-red-600 dark:text-red-400">
              Connection error: {integration.last_error}. Please reconnect.
            </div>
          )}
      </div>

      {/* Channel Settings (expandable) */}
      {isConnected && showSettings && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
          <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            Channel Settings
          </h4>

          {channelsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
              <span className="text-[10px] text-zinc-500">
                Loading channels...
              </span>
            </div>
          ) : availableChannels.length === 0 ? (
            <div className="text-[10px] text-zinc-500 py-2">
              No channels available. Make sure the bot is invited to at least
              one channel.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Policy Sales Channel */}
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Policy Sales Notifications
                </Label>
                <Select
                  value={integration?.policy_channel_id || ""}
                  onValueChange={(value) =>
                    handleChannelSelect("policy", value)
                  }
                >
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="Select a channel...">
                      {integration?.policy_channel_name ? (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {integration.policy_channel_name}
                        </span>
                      ) : (
                        "Select a channel..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannels.map((channel: SlackChannel) => (
                      <SelectItem
                        key={channel.id}
                        value={channel.id}
                        className="text-[11px]"
                      >
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-zinc-400">
                  New policy sales will be posted here
                </p>
              </div>

              {/* Leaderboard Channel */}
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Daily Leaderboard
                </Label>
                <Select
                  value={integration?.leaderboard_channel_id || ""}
                  onValueChange={(value) =>
                    handleChannelSelect("leaderboard", value)
                  }
                >
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="Select a channel...">
                      {integration?.leaderboard_channel_name ? (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {integration.leaderboard_channel_name}
                        </span>
                      ) : (
                        "Select a channel..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannels.map((channel: SlackChannel) => (
                      <SelectItem
                        key={channel.id}
                        value={channel.id}
                        className="text-[11px]"
                      >
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-zinc-400">
                  Daily leaderboard will be posted here
                </p>
              </div>

              {/* Toggle Options */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                      Include client name
                    </Label>
                    <p className="text-[9px] text-zinc-400">
                      Show client name in policy notifications
                    </p>
                  </div>
                  <Switch
                    checked={integration?.include_client_info || false}
                    onCheckedChange={(checked) =>
                      handleToggleSetting("include_client_info", checked)
                    }
                    disabled={updateSettings.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                      Include leaderboard with each sale
                    </Label>
                    <p className="text-[9px] text-zinc-400">
                      Post leaderboard as reply to each policy notification
                    </p>
                  </div>
                  <Switch
                    checked={
                      integration?.include_leaderboard_with_policy ?? true
                    }
                    onCheckedChange={(checked) =>
                      handleToggleSetting(
                        "include_leaderboard_with_policy",
                        checked,
                      )
                    }
                    disabled={updateSettings.isPending}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
