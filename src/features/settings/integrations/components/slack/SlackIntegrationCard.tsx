// src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx
// Multi-workspace Slack integration UI

import { useState, useMemo } from "react";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Hash,
  Plus,
  Building2,
  Link2,
  Trash2,
  ExternalLink,
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
  useSlackIntegrations,
  useConnectSlack,
  useDisconnectSlackById,
  useTestSlackConnectionById,
  useSlackChannelsById,
  useUpdateSlackIntegrationSettings,
  useJoinSlackChannelById,
  useUserSlackPreferences,
  useUpdateUserSlackPreferences,
  useSlackWebhooks,
  useAddSlackWebhook,
  useUpdateSlackWebhook,
  useDeleteSlackWebhook,
} from "@/hooks/slack";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type {
  SlackIntegration,
  SlackChannel,
  PolicyPostChannel,
  SlackWebhook,
} from "@/types/slack.types";

// ============================================================================
// Sub-component: Single Workspace Card
// ============================================================================

interface WorkspaceCardProps {
  integration: SlackIntegration;
  userPrefs: {
    policy_post_channels: PolicyPostChannel[] | null;
    auto_post_enabled: boolean | null;
    default_view_channel_id: string | null;
    default_view_channel_name: string | null;
    default_view_integration_id: string | null;
  } | null;
  onUpdateUserPrefs: (input: {
    policyPostChannels?: PolicyPostChannel[];
    autoPostEnabled?: boolean;
    defaultViewChannelId?: string | null;
    defaultViewChannelName?: string | null;
    defaultViewIntegrationId?: string | null;
  }) => Promise<void>;
  isUpdatingUserPrefs: boolean;
}

function WorkspaceCard({
  integration,
  userPrefs,
  onUpdateUserPrefs,
  isUpdatingUserPrefs,
}: WorkspaceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: channels = [], isLoading: channelsLoading } =
    useSlackChannelsById(isExpanded ? integration.id : undefined);

  const disconnectSlack = useDisconnectSlackById();
  const testConnection = useTestSlackConnectionById();
  const updateSettings = useUpdateSlackIntegrationSettings();
  const joinChannel = useJoinSlackChannelById();

  // Filter to only show channels the bot is a member of
  const availableChannels = useMemo(() => {
    return channels.filter((c: SlackChannel) => c.is_member && !c.is_archived);
  }, [channels]);

  const handleDisconnect = async () => {
    if (
      !confirm(
        `Are you sure you want to disconnect "${integration.display_name || integration.team_name}"? This will stop notifications to this workspace.`,
      )
    ) {
      return;
    }
    try {
      await disconnectSlack.mutateAsync(integration.id);
      toast.success(`Disconnected from ${integration.team_name}`);
    } catch {
      toast.error("Failed to disconnect workspace");
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync(integration.id);
      if (result.ok) {
        toast.success(`${integration.team_name} connection is working`);
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
        const result = await joinChannel.mutateAsync({
          integrationId: integration.id,
          channelId,
        });
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
          integrationId: integration.id,
          settings: {
            policy_channel_id: channelId,
            policy_channel_name: channel.name,
          },
        });
        toast.success(`Policy notifications will go to #${channel.name}`);
      } else {
        await updateSettings.mutateAsync({
          integrationId: integration.id,
          settings: {
            leaderboard_channel_id: channelId,
            leaderboard_channel_name: channel.name,
          },
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
      await updateSettings.mutateAsync({
        integrationId: integration.id,
        settings: { [setting]: value },
      });
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const handleToggleAdditionalChannel = async (
    channelId: string,
    channelName: string,
    isSelected: boolean,
  ) => {
    const currentChannels = userPrefs?.policy_post_channels ?? [];

    let newChannels: PolicyPostChannel[];
    if (isSelected) {
      newChannels = [
        ...currentChannels,
        {
          integration_id: integration.id,
          channel_id: channelId,
          channel_name: channelName,
        },
      ];
    } else {
      newChannels = currentChannels.filter(
        (c) =>
          !(c.integration_id === integration.id && c.channel_id === channelId),
      );
    }

    try {
      await onUpdateUserPrefs({ policyPostChannels: newChannels });
    } catch {
      toast.error("Failed to update channel preferences");
    }
  };

  const handleSetDefaultViewChannel = async (channelId: string) => {
    const channel = channels.find((c: SlackChannel) => c.id === channelId);
    try {
      await onUpdateUserPrefs({
        defaultViewIntegrationId: integration.id,
        defaultViewChannelId: channelId,
        defaultViewChannelName: channel?.name || null,
      });
      toast.success(
        channel
          ? `Default channel set to #${channel.name}`
          : "Default channel cleared",
      );
    } catch {
      toast.error("Failed to update default channel");
    }
  };

  const isConnected = integration.isConnected;

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* Workspace Header */}
      <div
        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
          isExpanded ? "border-b border-zinc-200 dark:border-zinc-700" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand Icon */}
        <div className="text-zinc-400">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        {/* Workspace Icon */}
        <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/30">
          <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>

        {/* Workspace Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {integration.display_name || integration.team_name}
            </span>
            {isConnected ? (
              <Badge
                variant="default"
                className="text-[8px] h-4 px-1 bg-green-600"
              >
                <CheckCircle2 className="h-2 w-2 mr-0.5" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[8px] h-4 px-1">
                <XCircle className="h-2 w-2 mr-0.5" />
                Disconnected
              </Badge>
            )}
          </div>
          {integration.policy_channel_name && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
              <Hash className="h-2.5 w-2.5" />
              {integration.policy_channel_name}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleTestConnection}
            disabled={testConnection.isPending}
            title="Test connection"
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
            className="h-6 px-2 text-[9px] text-red-500 hover:text-red-600"
            onClick={handleDisconnect}
            disabled={disconnectSlack.isPending}
          >
            Remove
          </Button>
        </div>
      </div>

      {/* Expanded Settings */}
      {isExpanded && isConnected && (
        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-4">
          {/* Channel Settings */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Channel Settings
            </h5>

            {channelsLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                <span className="text-[10px] text-zinc-500">
                  Loading channels...
                </span>
              </div>
            ) : availableChannels.length === 0 ? (
              <div className="text-[10px] text-zinc-500 py-2">
                No channels available. Invite the bot to channels first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Policy Sales Channel */}
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-600 dark:text-zinc-400">
                    Policy Sales
                  </Label>
                  <Select
                    value={integration.policy_channel_id || ""}
                    onValueChange={(value) =>
                      handleChannelSelect("policy", value)
                    }
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue placeholder="Select...">
                        {integration.policy_channel_name ? (
                          <span className="flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            {integration.policy_channel_name}
                          </span>
                        ) : (
                          "Select..."
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannels.map((channel: SlackChannel) => (
                        <SelectItem
                          key={channel.id}
                          value={channel.id}
                          className="text-[10px]"
                        >
                          <span className="flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            {channel.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Leaderboard Channel */}
                <div className="space-y-1">
                  <Label className="text-[9px] text-zinc-600 dark:text-zinc-400">
                    Leaderboard
                  </Label>
                  <Select
                    value={integration.leaderboard_channel_id || ""}
                    onValueChange={(value) =>
                      handleChannelSelect("leaderboard", value)
                    }
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue placeholder="Select...">
                        {integration.leaderboard_channel_name ? (
                          <span className="flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            {integration.leaderboard_channel_name}
                          </span>
                        ) : (
                          "Select..."
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannels.map((channel: SlackChannel) => (
                        <SelectItem
                          key={channel.id}
                          value={channel.id}
                          className="text-[10px]"
                        >
                          <span className="flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            {channel.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Toggle Options */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              <label className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
                <Switch
                  checked={integration.include_client_info || false}
                  onCheckedChange={(checked) =>
                    handleToggleSetting("include_client_info", checked)
                  }
                  disabled={updateSettings.isPending}
                  className="scale-75"
                />
                Include client name
              </label>
              <label className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
                <Switch
                  checked={integration.include_leaderboard_with_policy ?? true}
                  onCheckedChange={(checked) =>
                    handleToggleSetting(
                      "include_leaderboard_with_policy",
                      checked,
                    )
                  }
                  disabled={updateSettings.isPending}
                  className="scale-75"
                />
                Leaderboard with each sale
              </label>
            </div>
          </div>

          {/* Your Preferences for this Workspace */}
          {!channelsLoading && availableChannels.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <h5 className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                Your Preferences
              </h5>

              {/* Default View Channel */}
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-600 dark:text-zinc-400">
                  Default Channel (Messages Tab)
                </Label>
                <Select
                  value={
                    userPrefs?.default_view_integration_id === integration.id
                      ? userPrefs?.default_view_channel_id || ""
                      : ""
                  }
                  onValueChange={handleSetDefaultViewChannel}
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue placeholder="Select default...">
                      {userPrefs?.default_view_integration_id ===
                        integration.id &&
                      userPrefs?.default_view_channel_name ? (
                        <span className="flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" />
                          {userPrefs.default_view_channel_name}
                        </span>
                      ) : (
                        "Select default..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannels.map((channel: SlackChannel) => (
                      <SelectItem
                        key={channel.id}
                        value={channel.id}
                        className="text-[10px]"
                      >
                        <span className="flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Channels */}
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-600 dark:text-zinc-400">
                  Additional Channels for My Sales
                </Label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {availableChannels
                    .filter(
                      (c: SlackChannel) =>
                        c.id !== integration.policy_channel_id,
                    )
                    .map((channel: SlackChannel) => {
                      const isSelected = (
                        userPrefs?.policy_post_channels ?? []
                      ).some(
                        (c) =>
                          c.integration_id === integration.id &&
                          c.channel_id === channel.id,
                      );
                      return (
                        <label
                          key={channel.id}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] cursor-pointer border transition-colors ${
                            isSelected
                              ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300 dark:hover:border-purple-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleToggleAdditionalChannel(
                                channel.id,
                                channel.name,
                                e.target.checked,
                              )
                            }
                            className="sr-only"
                            disabled={isUpdatingUserPrefs}
                          />
                          <Hash className="h-2.5 w-2.5" />
                          {channel.name}
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnected State */}
      {isExpanded && !isConnected && (
        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            This workspace is disconnected. Remove it or reconnect by adding it
            again.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-component: Webhook Card
// ============================================================================

interface WebhookCardProps {
  webhook: SlackWebhook;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

function WebhookCard({
  webhook,
  onDelete,
  onToggle,
  isDeleting,
  isUpdating,
}: WebhookCardProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Link2 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {webhook.channel_name}
            </span>
            {webhook.workspace_name && (
              <span className="text-[9px] text-zinc-400 truncate">
                ({webhook.workspace_name})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch
          checked={webhook.notifications_enabled ?? true}
          onCheckedChange={(checked) => onToggle(webhook.id, checked)}
          disabled={isUpdating}
          className="scale-75"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-zinc-400 hover:text-red-500"
          onClick={() => onDelete(webhook.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-component: Add Webhook Dialog
// ============================================================================

interface AddWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    webhookUrl: string,
    channelName: string,
    workspaceName: string,
  ) => Promise<void>;
  isAdding: boolean;
}

function AddWebhookDialog({
  open,
  onOpenChange,
  onAdd,
  isAdding,
}: AddWebhookDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!webhookUrl.trim()) {
      setError("Webhook URL is required");
      return;
    }

    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      setError(
        "Invalid webhook URL. It should start with https://hooks.slack.com/",
      );
      return;
    }

    if (!channelName.trim()) {
      setError("Channel name is required");
      return;
    }

    try {
      await onAdd(webhookUrl.trim(), channelName.trim(), workspaceName.trim());
      setWebhookUrl("");
      setChannelName("");
      setWorkspaceName("");
      onOpenChange(false);
    } catch {
      setError("Failed to add webhook");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Slack Webhook</DialogTitle>
          <DialogDescription className="text-[11px]">
            Webhooks let you post notifications to any Slack workspace without
            OAuth.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Instructions */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
              How to get a webhook URL:
            </p>
            <ol className="text-[9px] text-zinc-500 dark:text-zinc-400 space-y-1 list-decimal list-inside">
              <li>Go to your Slack workspace</li>
              <li>Open Apps → Incoming Webhooks</li>
              <li>Click "Add New Webhook to Workspace"</li>
              <li>Select the channel and copy the URL</li>
            </ol>
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] text-purple-600 hover:text-purple-700"
            >
              Learn more <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          {/* Form fields */}
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Webhook URL *
              </Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="h-8 text-[11px] mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Channel Name *
              </Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="#sales"
                className="h-8 text-[11px] mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Workspace Name (optional)
              </Label>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Partner Agency"
                className="h-8 text-[11px] mt-1"
              />
            </div>
          </div>

          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-[10px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isAdding}
            className="h-7 text-[10px]"
          >
            {isAdding ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            Add Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SlackIntegrationCard() {
  const { data: integrations = [], isLoading } = useSlackIntegrations();
  const { data: userPrefs } = useUserSlackPreferences();
  const { data: webhooks = [], isLoading: webhooksLoading } =
    useSlackWebhooks();
  const connectSlack = useConnectSlack();
  const updateUserPrefs = useUpdateUserSlackPreferences();
  const addWebhook = useAddSlackWebhook();
  const updateWebhook = useUpdateSlackWebhook();
  const deleteWebhook = useDeleteSlackWebhook();

  const [showUserPrefs, setShowUserPrefs] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);

  const connectedIntegrations = integrations.filter((i) => i.isConnected);
  const hasConnections = connectedIntegrations.length > 0;

  const handleConnect = async () => {
    try {
      await connectSlack.mutateAsync("/settings/integrations");
    } catch {
      toast.error("Failed to initiate Slack connection");
    }
  };

  const handleUpdateUserPrefs = async (input: {
    policyPostChannels?: PolicyPostChannel[];
    autoPostEnabled?: boolean;
    defaultViewChannelId?: string | null;
    defaultViewChannelName?: string | null;
    defaultViewIntegrationId?: string | null;
  }) => {
    await updateUserPrefs.mutateAsync(input);
  };

  const handleToggleAutoPost = async (enabled: boolean) => {
    try {
      await updateUserPrefs.mutateAsync({ autoPostEnabled: enabled });
      toast.success(
        enabled
          ? "Auto-posting enabled"
          : "Auto-posting disabled for your sales",
      );
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const handleAddWebhook = async (
    webhookUrl: string,
    channelName: string,
    workspaceName: string,
  ) => {
    await addWebhook.mutateAsync({
      webhookUrl,
      channelName,
      workspaceName: workspaceName || undefined,
    });
    toast.success(`Added webhook for ${channelName}`);
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to remove this webhook?")) return;
    try {
      await deleteWebhook.mutateAsync(webhookId);
      toast.success("Webhook removed");
    } catch {
      toast.error("Failed to remove webhook");
    }
  };

  const handleToggleWebhook = async (webhookId: string, enabled: boolean) => {
    try {
      await updateWebhook.mutateAsync({
        webhookId,
        updates: { notifications_enabled: enabled },
      });
    } catch {
      toast.error("Failed to update webhook");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Card */}
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
              {hasConnections ? (
                <Badge
                  variant="default"
                  className="text-[9px] h-4 px-1.5 bg-green-600"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  {connectedIntegrations.length} Workspace
                  {connectedIntegrations.length > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  <XCircle className="h-2.5 w-2.5 mr-0.5" />
                  Not Connected
                </Badge>
              )}
            </div>

            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {hasConnections
                ? "Post policy sales and leaderboards to your Slack workspaces."
                : "Connect Slack workspaces to enable automated notifications."}
            </p>
          </div>

          {/* Add Workspace Button */}
          <Button
            size="sm"
            variant={hasConnections ? "outline" : "default"}
            className="h-7 px-3 text-[10px]"
            onClick={handleConnect}
            disabled={connectSlack.isPending}
          >
            {connectSlack.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            {hasConnections ? "Add Workspace" : "Connect Slack"}
          </Button>
        </div>
      </div>

      {/* Connected Workspaces List */}
      {integrations.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
          <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Connected Workspaces
          </h4>

          <div className="space-y-2">
            {integrations.map((integration) => (
              <WorkspaceCard
                key={integration.id}
                integration={integration}
                userPrefs={userPrefs ?? null}
                onUpdateUserPrefs={handleUpdateUserPrefs}
                isUpdatingUserPrefs={updateUserPrefs.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notification Webhooks Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
              Notification Webhooks
            </h4>
            <p className="text-[9px] text-zinc-400">
              Post notifications to any workspace without OAuth
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[9px]"
            onClick={() => setShowAddWebhook(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Webhook
          </Button>
        </div>

        {webhooksLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
            <span className="text-[10px] text-zinc-500">
              Loading webhooks...
            </span>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="py-3 text-center">
            <Link2 className="h-5 w-5 text-zinc-300 dark:text-zinc-600 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500">
              No webhooks configured. Add one to post notifications to other
              workspaces.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onDelete={handleDeleteWebhook}
                onToggle={handleToggleWebhook}
                isDeleting={deleteWebhook.isPending}
                isUpdating={updateWebhook.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Webhook Dialog */}
      <AddWebhookDialog
        open={showAddWebhook}
        onOpenChange={setShowAddWebhook}
        onAdd={handleAddWebhook}
        isAdding={addWebhook.isPending}
      />

      {/* Global User Preferences */}
      {hasConnections && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowUserPrefs(!showUserPrefs)}
          >
            <div>
              <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                Global Preferences
              </h4>
              <p className="text-[9px] text-zinc-400">
                Settings that apply across all workspaces
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 transition-transform ${
                showUserPrefs ? "rotate-180" : ""
              }`}
            />
          </div>

          {showUserPrefs && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    Auto-post my sales to Slack
                  </Label>
                  <p className="text-[9px] text-zinc-400">
                    Automatically post when you create a policy
                  </p>
                </div>
                <Switch
                  checked={userPrefs?.auto_post_enabled ?? true}
                  onCheckedChange={handleToggleAutoPost}
                  disabled={updateUserPrefs.isPending}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
