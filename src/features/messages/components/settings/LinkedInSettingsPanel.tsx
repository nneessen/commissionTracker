// src/features/messages/components/settings/LinkedInSettingsPanel.tsx
// LinkedIn messaging settings - connection status and account info

import { useState } from "react";
import {
  Loader2,
  Linkedin,
  Check,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import {
  useActiveLinkedInIntegration,
  useConnectLinkedIn,
  useDisconnectLinkedIn,
} from "@/hooks/linkedin";
import { NotConnectedState } from "./NotConnectedState";

export function LinkedInSettingsPanel() {
  const { data: integration, isLoading } = useActiveLinkedInIntegration();
  const connectLinkedIn = useConnectLinkedIn();
  const disconnectLinkedIn = useDisconnectLinkedIn();

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const handleReconnect = async () => {
    try {
      const returnUrl = `${window.location.origin}/messages?tab=settings`;
      await connectLinkedIn.mutateAsync({ returnUrl });
    } catch (err) {
      console.error("[LinkedInSettingsPanel] Reconnect failed:", err);
      toast.error("Failed to initiate LinkedIn connection");
    }
  };

  const handleDisconnect = async () => {
    if (!integration?.id) {
      toast.error("No integration found to disconnect");
      return;
    }

    try {
      await disconnectLinkedIn.mutateAsync(integration.id);
      setShowDisconnectDialog(false);
      toast.success("LinkedIn account disconnected");
    } catch (err) {
      console.error("[LinkedInSettingsPanel] Disconnect failed:", err);
      toast.error("Failed to disconnect LinkedIn account");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isConnected = integration?.connection_status === "connected";
  const needsReconnection = integration?.connection_status === "credentials";
  const hasError = integration?.connection_status === "error";

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Connection Status */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Linkedin className="h-4 w-4 text-zinc-500" />
            LinkedIn Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!integration ? (
            <NotConnectedState
              icon={Linkedin}
              platform="LinkedIn"
              onConnect={() => {
                window.location.href = "/settings?tab=integrations";
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={integration.linkedin_profile_picture_url || undefined}
                    alt={integration.linkedin_display_name || "LinkedIn"}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs">
                    {integration.linkedin_display_name
                      ?.charAt(0)
                      .toUpperCase() ||
                      integration.linkedin_username?.charAt(0).toUpperCase() ||
                      "LI"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                    {integration.linkedin_display_name ||
                      integration.linkedin_username}
                  </p>
                  {integration.linkedin_headline && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {integration.linkedin_headline}
                    </p>
                  )}
                  {integration.linkedin_username && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      @{integration.linkedin_username}
                    </p>
                  )}
                </div>
                {isConnected && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                  >
                    <Check className="h-2.5 w-2.5 mr-1" />
                    Connected
                  </Badge>
                )}
                {needsReconnection && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  >
                    <AlertCircle className="h-2.5 w-2.5 mr-1" />
                    Reconnect
                  </Badge>
                )}
                {hasError && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                  >
                    <AlertCircle className="h-2.5 w-2.5 mr-1" />
                    Error
                  </Badge>
                )}
                {/* Disconnect Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={disconnectLinkedIn.isPending}
                >
                  Disconnect
                </Button>
              </div>

              {/* Reconnect if needed */}
              {(needsReconnection || hasError) && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-[11px] text-amber-800 dark:text-amber-200 mb-2">
                    {needsReconnection
                      ? "Your LinkedIn session has expired. Please reconnect to continue messaging."
                      : "There was an error with your LinkedIn connection. Please try reconnecting."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={handleReconnect}
                    disabled={connectLinkedIn.isPending}
                  >
                    {connectLinkedIn.isPending ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                    )}
                    Reconnect LinkedIn
                  </Button>
                </div>
              )}

              {/* Info Note */}
              {isConnected && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  LinkedIn messaging uses Unipile for secure API access. Your
                  session is active and ready to send messages.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-blue-600" />
              Disconnect LinkedIn
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Are you sure you want to disconnect your LinkedIn account?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={integration?.linkedin_profile_picture_url || undefined}
                  alt={integration?.linkedin_display_name || "LinkedIn"}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-[10px]">
                  {integration?.linkedin_display_name
                    ?.charAt(0)
                    .toUpperCase() ||
                    integration?.linkedin_username?.charAt(0).toUpperCase() ||
                    "LI"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                  {integration?.linkedin_display_name ||
                    integration?.linkedin_username}
                </p>
                {integration?.linkedin_headline && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {integration.linkedin_headline}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] text-amber-800 dark:text-amber-200">
                This will stop all LinkedIn DM features. Your conversation
                history will be preserved, but you won't be able to send or
                receive messages until you reconnect.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectDialog(false)}
              className="h-7 text-[10px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnectLinkedIn.isPending}
              className="h-7 text-[10px]"
            >
              {disconnectLinkedIn.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
