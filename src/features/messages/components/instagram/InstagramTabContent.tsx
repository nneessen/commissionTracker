// src/features/messages/components/instagram/InstagramTabContent.tsx
// Main entry point for Instagram tab with feature gate

import { useState, type ReactNode } from "react";
import { FeatureGate } from "@/components/subscription";
import {
  useActiveInstagramIntegration,
  useConnectInstagram,
} from "@/hooks/instagram";
import { InstagramConnectCard } from "./InstagramConnectCard";
import { InstagramConversationView } from "./InstagramConversationView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Instagram,
  Settings,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { InstagramConversation } from "@/types/instagram.types";

/**
 * Banner shown when Instagram token has expired
 */
function TokenExpiredBanner({
  onReconnect,
  isReconnecting,
}: {
  onReconnect: () => void;
  isReconnecting: boolean;
}): ReactNode {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
            Instagram connection expired
          </h4>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-2">
            Your Instagram access token has expired. Reconnect to continue
            sending and receiving messages.
          </p>
          <Button
            onClick={onReconnect}
            disabled={isReconnecting}
            size="sm"
            className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isReconnecting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Reconnect Instagram
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the tab content
 */
function TabContentSkeleton(): ReactNode {
  return (
    <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto mb-3" />
        <Skeleton className="h-4 w-32 mx-auto mb-2" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  );
}

interface InstagramTabContentProps {
  selectedConversation?: InstagramConversation | null;
  /** Callback for mobile back button - when provided, shows a back button */
  onBack?: () => void;
}

export function InstagramTabContent({
  selectedConversation,
  onBack,
}: InstagramTabContentProps): ReactNode {
  return (
    <FeatureGate feature="instagram_messaging" promptVariant="card">
      <InstagramTabContentInner
        selectedConversation={selectedConversation}
        onBack={onBack}
      />
    </FeatureGate>
  );
}

function InstagramTabContentInner({
  selectedConversation,
  onBack,
}: InstagramTabContentProps): ReactNode {
  const {
    data: integration,
    isLoading,
    error,
    refetch,
  } = useActiveInstagramIntegration();
  const connectInstagram = useConnectInstagram();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnectionError(null);
    try {
      await connectInstagram.mutateAsync("/messages");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect Instagram";
      setConnectionError(errorMessage);
    }
  };

  const handleClearError = () => {
    setConnectionError(null);
  };

  // Check if token is expired or has errors
  const isTokenExpired =
    integration?.connection_status === "expired" ||
    integration?.connection_status === "error";

  // Loading state - use skeleton for better UX
  if (isLoading) {
    return <TabContentSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center max-w-sm px-4">
          <div className="mx-auto w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
            <Instagram className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
            Failed to load Instagram integration
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-4">
            {error.message}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!integration) {
    return (
      <InstagramConnectCard
        onConnect={handleConnect}
        isConnecting={connectInstagram.isPending}
        error={connectionError}
        onClearError={handleClearError}
      />
    );
  }

  // Connected - show conversation view or empty state
  if (selectedConversation) {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile back button */}
        {onBack && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 rounded-t-lg border border-b-0 border-zinc-200 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-7 px-2 text-[11px]"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Conversations
            </Button>
          </div>
        )}
        {/* Token expired banner above conversation view */}
        {isTokenExpired && (
          <div className="p-3 bg-white dark:bg-zinc-900 border-x border-zinc-200 dark:border-zinc-800">
            <TokenExpiredBanner
              onReconnect={handleConnect}
              isReconnecting={connectInstagram.isPending}
            />
          </div>
        )}
        <div className={isTokenExpired || onBack ? "flex-1" : "h-full"}>
          <InstagramConversationView
            conversation={selectedConversation}
            integrationId={integration.id}
            isTokenExpired={isTokenExpired}
          />
        </div>
      </div>
    );
  }

  // No conversation selected - show empty state
  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Token expired banner */}
      {isTokenExpired && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <TokenExpiredBanner
            onReconnect={handleConnect}
            isReconnecting={connectInstagram.isPending}
          />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          {/* Connected account info */}
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center mb-3 shadow-lg">
            {integration.instagram_profile_picture_url ? (
              <img
                src={integration.instagram_profile_picture_url}
                alt={integration.instagram_username}
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              <Instagram className="h-6 w-6 text-white" />
            )}
          </div>

          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
            @{integration.instagram_username}
          </h3>
          {integration.instagram_name && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
              {integration.instagram_name}
            </p>
          )}

          {/* Connection status badge */}
          {isTokenExpired ? (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                Reconnection Required
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                Connected
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-1 mb-2">
            <MessageSquare className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4">
            {isTokenExpired
              ? "Reconnect your Instagram account to continue messaging"
              : "Select a conversation from the sidebar to view messages"}
          </p>

          {!isTokenExpired && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Conversations will appear once you receive messages from Instagram
              users, or you can sync your recent conversations.
            </p>
          )}

          {/* Settings link */}
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              to="/settings"
              search={{ tab: "integrations" }}
              className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <Settings className="h-3 w-3" />
              Manage Instagram Integration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
