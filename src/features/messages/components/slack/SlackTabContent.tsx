// src/features/messages/components/slack/SlackTabContent.tsx
// Main Slack tab content - shows channel view when connected

import { MessageSquare, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useSlackIntegrations, useConnectSlack } from "@/hooks/slack";
import { SlackChannelView } from "./SlackChannelView";
import { toast } from "sonner";
import type { SlackChannel } from "@/types/slack.types";

interface SlackTabContentProps {
  selectedChannel: SlackChannel | null;
  selectedIntegrationId: string | null;
}

export function SlackTabContent({
  selectedChannel,
  selectedIntegrationId,
}: SlackTabContentProps) {
  const { data: integrations = [], isLoading } = useSlackIntegrations();
  const connectSlack = useConnectSlack();
  const isConnected = integrations.some((i) => i.isConnected);

  const handleConnect = async () => {
    try {
      await connectSlack.mutateAsync("/messages");
    } catch {
      toast.error("Failed to connect to Slack");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Not connected
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
            Connect your Slack workspace to view and send messages directly from
            here.
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
              Settings
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Connected but no channel selected
  if (!selectedChannel) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Select a channel to view messages
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Link to="/settings" search={{ tab: "integrations" }}>
              <Button variant="outline" size="sm" className="h-6 text-[10px]">
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show channel view
  return (
    <SlackChannelView
      channel={selectedChannel}
      integrationId={selectedIntegrationId!}
    />
  );
}
