// src/features/messages/components/settings/InstagramSettingsPanel.tsx
// Instagram messaging settings - connection status and account info

import {
  Loader2,
  Instagram,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useActiveInstagramIntegration } from "@/hooks/instagram";
import { NotConnectedState } from "./NotConnectedState";

export function InstagramSettingsPanel() {
  const { data: integration, isLoading } = useActiveInstagramIntegration();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isConnected = integration?.connection_status === "connected";
  const isExpired = integration?.connection_status === "expired";
  const hasError = integration?.connection_status === "error";

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Connection Status */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Instagram className="h-4 w-4 text-zinc-500" />
            Instagram Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!integration ? (
            <NotConnectedState
              icon={Instagram}
              platform="Instagram"
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
                    src={integration.instagram_profile_picture_url || undefined}
                    alt={integration.instagram_username || "Instagram"}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                    {integration.instagram_username?.charAt(0).toUpperCase() ||
                      "IG"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                    {integration.instagram_name ||
                      integration.instagram_username}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    @{integration.instagram_username}
                  </p>
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
                {isExpired && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  >
                    <AlertCircle className="h-2.5 w-2.5 mr-1" />
                    Expired
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
              </div>

              {/* Reconnect if needed */}
              {(isExpired || hasError) && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-[11px] text-amber-800 dark:text-amber-200 mb-2">
                    {isExpired
                      ? "Your Instagram connection has expired. Please reconnect to continue messaging."
                      : "There was an error with your Instagram connection. Please try reconnecting."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      window.location.href = "/settings?tab=integrations";
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Reconnect Instagram
                  </Button>
                </div>
              )}

              {/* Info Note */}
              {isConnected && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Manage templates in the Templates tab. To disconnect or
                  reconnect, go to Settings → Integrations.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
