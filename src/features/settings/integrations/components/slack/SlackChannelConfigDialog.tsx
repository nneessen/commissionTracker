// src/features/settings/integrations/components/slack/SlackChannelConfigDialog.tsx

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSlackChannels,
  useCreateSlackChannelConfig,
  useUpdateSlackChannelConfig,
} from "@/hooks/slack";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { useAgenciesByImo } from "@/hooks/imo/useImoQueries";
import type {
  SlackChannelConfig,
  SlackNotificationType,
  CreateChannelConfigForm,
} from "@/types/slack.types";
import { toast } from "sonner";

const NOTIFICATION_TYPES: {
  value: SlackNotificationType;
  label: string;
  description: string;
}[] = [
  {
    value: "policy_created",
    label: "Policy Sales",
    description: "New policy sold notifications",
  },
  {
    value: "daily_leaderboard",
    label: "Daily Leaderboard",
    description: "Daily sales leaderboard summary",
  },
  {
    value: "policy_cancelled",
    label: "Cancellations",
    description: "Policy cancellation notifications",
  },
  {
    value: "weekly_summary",
    label: "Weekly Summary",
    description: "Weekly production summary",
  },
  {
    value: "commission_milestone",
    label: "Commission Milestones",
    description: "Agent commission milestone achievements",
  },
];

interface SlackChannelConfigDialogProps {
  open: boolean;
  onClose: () => void;
  existingConfig: SlackChannelConfig | null;
}

export function SlackChannelConfigDialog({
  open,
  onClose,
  existingConfig,
}: SlackChannelConfigDialogProps) {
  const { data: profile } = useCurrentUserProfile();
  const { data: channels, isLoading: channelsLoading } = useSlackChannels();
  const { data: agencies, isLoading: agenciesLoading } = useAgenciesByImo(
    profile?.imo_id ?? undefined,
  );
  const createConfig = useCreateSlackChannelConfig();
  const updateConfig = useUpdateSlackChannelConfig();

  const [formData, setFormData] = useState<CreateChannelConfigForm>({
    channelId: "",
    channelName: "",
    channelType: "public",
    agencyId: null,
    notificationType: "policy_created",
    includeClientInfo: false,
    includeAgentPhoto: true,
    includeLeaderboard: true,
  });

  // Reset form when dialog opens/closes or config changes
  useEffect(() => {
    if (existingConfig) {
      setFormData({
        channelId: existingConfig.channel_id,
        channelName: existingConfig.channel_name,
        channelType:
          (existingConfig.channel_type as "public" | "private") || "public",
        agencyId: existingConfig.agency_id,
        notificationType: existingConfig.notification_type,
        includeClientInfo: existingConfig.include_client_info ?? false,
        includeAgentPhoto: existingConfig.include_agent_photo ?? true,
        includeLeaderboard: existingConfig.include_leaderboard ?? true,
      });
    } else {
      setFormData({
        channelId: "",
        channelName: "",
        channelType: "public",
        agencyId: null,
        notificationType: "policy_created",
        includeClientInfo: false,
        includeAgentPhoto: true,
        includeLeaderboard: true,
      });
    }
  }, [existingConfig, open]);

  const handleChannelChange = (channelId: string) => {
    const channel = channels?.find((c) => c.id === channelId);
    if (channel) {
      setFormData((prev) => ({
        ...prev,
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.is_private ? "private" : "public",
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.channelId) {
      toast.error("Please select a channel");
      return;
    }

    try {
      if (existingConfig) {
        await updateConfig.mutateAsync({
          id: existingConfig.id,
          form: formData,
        });
        toast.success("Channel configuration updated");
      } else {
        await createConfig.mutateAsync(formData);
        toast.success("Channel configuration created");
      }
      onClose();
    } catch (_error) {
      toast.error(
        existingConfig
          ? "Failed to update configuration"
          : "Failed to create configuration",
      );
    }
  };

  const isLoading = channelsLoading || agenciesLoading;
  const isSaving = createConfig.isPending || updateConfig.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {existingConfig ? "Edit" : "Add"} Channel Configuration
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Channel Selection */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Slack Channel</Label>
              <Select
                value={formData.channelId}
                onValueChange={handleChannelChange}
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels?.map((channel) => (
                    <SelectItem
                      key={channel.id}
                      value={channel.id}
                      className="text-[11px]"
                    >
                      #{channel.name}
                      {channel.is_private && " (private)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notification Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Notification Type</Label>
              <Select
                value={formData.notificationType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    notificationType: value as SlackNotificationType,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="text-[11px]"
                    >
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <span className="text-zinc-500 ml-1.5">
                          — {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agency Selection */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Agency (Optional)</Label>
              <Select
                value={formData.agencyId || "all"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    agencyId: value === "all" ? null : value,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px]">
                    All Agencies
                  </SelectItem>
                  {agencies?.map((agency) => (
                    <SelectItem
                      key={agency.id}
                      value={agency.id}
                      className="text-[11px]"
                    >
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500">
                Leave as "All Agencies" to receive notifications from all
                agencies
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Label className="text-[11px] text-zinc-500">Options</Label>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeLeaderboard"
                  checked={formData.includeLeaderboard}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeLeaderboard: checked === true,
                    }))
                  }
                />
                <label
                  htmlFor="includeLeaderboard"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Include leaderboard with policy notifications
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeClientInfo"
                  checked={formData.includeClientInfo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeClientInfo: checked === true,
                    }))
                  }
                />
                <label
                  htmlFor="includeClientInfo"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Include client name in notifications
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeAgentPhoto"
                  checked={formData.includeAgentPhoto}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeAgentPhoto: checked === true,
                    }))
                  }
                />
                <label
                  htmlFor="includeAgentPhoto"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Include agent photo
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={handleSubmit}
            disabled={isSaving || !formData.channelId}
          >
            {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {existingConfig ? "Save Changes" : "Add Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
