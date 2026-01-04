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
import {
  Loader2,
  Instagram,
  Settings,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { InstagramConversation } from "@/types/instagram.types";

interface InstagramTabContentProps {
  selectedConversation?: InstagramConversation | null;
}

export function InstagramTabContent({
  selectedConversation,
}: InstagramTabContentProps): ReactNode {
  return (
    <FeatureGate feature="instagram_messaging" promptVariant="card">
      <InstagramTabContentInner selectedConversation={selectedConversation} />
    </FeatureGate>
  );
}

function InstagramTabContentInner({
  selectedConversation,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <Loader2 className="h-6 w-6 mx-auto mb-2 text-zinc-400 animate-spin" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Loading Instagram...
          </p>
        </div>
      </div>
    );
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
      <InstagramConversationView
        conversationId={selectedConversation.id}
        integrationId={integration.id}
      />
    );
  }

  // No conversation selected - show empty state
  return (
    <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
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

        <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            Connected
          </span>
        </div>

        <div className="flex items-center justify-center gap-1 mb-2">
          <MessageSquare className="h-4 w-4 text-zinc-400" />
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4">
          Select a conversation from the sidebar to view messages
        </p>

        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Conversations will appear once you receive messages from Instagram
          users, or you can sync your recent conversations.
        </p>

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
  );
}
