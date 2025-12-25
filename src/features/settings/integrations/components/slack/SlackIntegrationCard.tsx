// src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx

import { useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useSlackIntegration,
  useConnectSlack,
  useDisconnectSlack,
  useTestSlackConnection,
} from "@/hooks/slack";
import { SlackChannelConfigList } from "./SlackChannelConfigList";
import { toast } from "sonner";

export function SlackIntegrationCard() {
  const { data: integration, isLoading } = useSlackIntegration();
  const connectSlack = useConnectSlack();
  const disconnectSlack = useDisconnectSlack();
  const testConnection = useTestSlackConnection();

  const [showConfig, setShowConfig] = useState(false);

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
        "Are you sure you want to disconnect Slack? This will remove all channel configurations.",
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
                  onClick={() => setShowConfig(!showConfig)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  {showConfig ? "Hide" : "Configure"}
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

      {/* Channel Configuration (expandable) */}
      {isConnected && showConfig && <SlackChannelConfigList />}
    </div>
  );
}
