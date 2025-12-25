// src/features/settings/integrations/components/slack/SlackChannelConfigList.tsx

import { useState } from "react";
import {
  Hash,
  Plus,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useSlackChannelConfigs,
  useDeleteSlackChannelConfig,
  useToggleSlackChannelConfig,
} from "@/hooks/slack";
import { SlackChannelConfigDialog } from "./SlackChannelConfigDialog";
import type { SlackChannelConfig } from "@/types/slack.types";
import { toast } from "sonner";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  policy_created: "Policy Sales",
  policy_cancelled: "Cancellations",
  policy_renewed: "Renewals",
  daily_leaderboard: "Daily Leaderboard",
  weekly_summary: "Weekly Summary",
  commission_milestone: "Commission Milestones",
  agent_achievement: "Agent Achievements",
};

export function SlackChannelConfigList() {
  const { data: configs, isLoading } = useSlackChannelConfigs();
  const deleteConfig = useDeleteSlackChannelConfig();
  const toggleConfig = useToggleSlackChannelConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SlackChannelConfig | null>(
    null,
  );

  const handleAdd = () => {
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const handleEdit = (config: SlackChannelConfig) => {
    setEditingConfig(config);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this channel configuration?")) return;
    try {
      await deleteConfig.mutateAsync(id);
      toast.success("Channel configuration removed");
    } catch {
      toast.error("Failed to remove configuration");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleConfig.mutateAsync({ id, isActive });
      toast.success(
        isActive ? "Notifications enabled" : "Notifications disabled",
      );
    } catch {
      toast.error("Failed to update configuration");
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
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            Channel Notifications
          </h4>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Configure which notifications go to which channels
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Channel
        </Button>
      </div>

      {/* Config List */}
      {configs && configs.length > 0 ? (
        <div className="space-y-1.5">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center gap-2 p-2 rounded border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              {/* Channel Icon */}
              <Hash className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />

              {/* Channel Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                    #{config.channel_name}
                  </span>
                  {config.agencyName && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      ({config.agencyName})
                    </span>
                  )}
                  {!config.agency_id && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                      All Agencies
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge
                    variant={config.is_active ? "default" : "secondary"}
                    className="text-[8px] h-3.5 px-1"
                  >
                    {NOTIFICATION_TYPE_LABELS[config.notification_type] ||
                      config.notification_type}
                  </Badge>
                  {config.include_leaderboard && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                      +Leaderboard
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleToggle(config.id, !config.is_active)}
                  disabled={toggleConfig.isPending}
                  title={config.is_active ? "Disable" : "Enable"}
                >
                  {config.is_active ? (
                    <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px]"
                  onClick={() => handleEdit(config)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(config.id)}
                  disabled={deleteConfig.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-[11px] text-zinc-500 dark:text-zinc-400">
          No channel configurations yet. Add a channel to start receiving
          notifications.
        </div>
      )}

      {/* Dialog */}
      <SlackChannelConfigDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingConfig(null);
        }}
        existingConfig={editingConfig}
      />
    </div>
  );
}
