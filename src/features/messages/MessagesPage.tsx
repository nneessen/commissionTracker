// src/features/messages/MessagesPage.tsx
// Communications Hub - Redesigned with zinc palette and compact design patterns

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessagesLayout } from "./components/layout/MessagesLayout";
import { ThreadList } from "./components/inbox/ThreadList";
import { ThreadView } from "./components/thread/ThreadView";
import { ComposeDialog } from "./components/compose/ComposeDialog";
import { useEmailQuota } from "./hooks/useSendEmail";
import { useFolderCounts } from "./hooks/useFolderCounts";
import {
  Inbox,
  Send,
  FileText,
  BarChart3,
  Settings,
  Search,
  PenSquare,
  Star,
  Archive,
  Mail,
  MessageSquare,
  Instagram,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlackTabContent, SlackSidebar } from "./components/slack";
import type { SlackChannel } from "@/types/slack.types";

type TabType =
  | "email"
  | "slack"
  | "instagram"
  | "templates"
  | "analytics"
  | "settings";
type FolderType = "all" | "inbox" | "sent" | "starred" | "archived";

export function MessagesPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("email");
  const [activeFolder, setActiveFolder] = useState<FolderType>("all");
  const [selectedSlackChannel, setSelectedSlackChannel] =
    useState<SlackChannel | null>(null);

  // Get email quota
  const { remainingDaily, percentUsed, quota } = useEmailQuota();

  // Folder counts and unread
  const { counts, totalUnread } = useFolderCounts();

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleComposeNew = () => {
    setIsComposeOpen(true);
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: typeof Inbox }[] = [
    { id: "email", label: "Email", icon: Mail },
    { id: "slack", label: "Slack", icon: MessageSquare },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Folder configuration
  const folders: {
    id: FolderType;
    label: string;
    icon: typeof Inbox;
    count?: number;
  }[] = [
    { id: "all", label: "All", icon: Mail, count: counts.all },
    { id: "inbox", label: "Inbox", icon: Inbox, count: counts.inbox },
    { id: "sent", label: "Sent", icon: Send, count: counts.sent },
    { id: "starred", label: "Starred", icon: Star, count: counts.starred },
    {
      id: "archived",
      label: "Archived",
      icon: Archive,
      count: counts.archived,
    },
  ];

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        {/* Compact Header with inline stats */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Messages
              </h1>
            </div>

            {/* Inline compact stats */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1">
                <Inbox className="h-3 w-3 text-blue-500" />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {totalUnread}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">unread</span>
              </div>
              <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-zinc-400" />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {counts.all}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">total</span>
              </div>
              <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 dark:text-zinc-400">Quota:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {quota ? `${quota.dailyUsed}/${quota.dailyLimit}` : "0/50"}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  ({remainingDaily} left)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-56">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 pr-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Button
              onClick={handleComposeNew}
              size="sm"
              className="h-6 text-[10px] px-2"
            >
              <PenSquare className="h-3 w-3 mr-1" />
              Compose
            </Button>
          </div>
        </div>

        {/* Compact tabs */}
        <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
                  isActive
                    ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 flex gap-2 overflow-hidden">
          {/* Left Sidebar - Context-aware based on active tab */}
          <div className="w-36 flex-shrink-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {activeTab === "slack" ? (
              /* Slack channels sidebar */
              <SlackSidebar
                selectedChannelId={selectedSlackChannel?.id || null}
                onChannelSelect={setSelectedSlackChannel}
              />
            ) : (
              /* Email folders sidebar */
              <div className="p-2 flex-1 flex flex-col min-h-0 overflow-auto">
                <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-2 mb-1.5">
                  Folders
                </div>
                <div className="space-y-0.5">
                  {folders.map((folder) => {
                    const Icon = folder.icon;
                    const isActive = activeFolder === folder.id;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setActiveFolder(folder.id)}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors",
                          isActive
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="flex-1 text-left">{folder.label}</span>
                        {folder.count !== undefined && folder.count > 0 && (
                          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                            {folder.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1" />

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2">
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1 px-1">
                    <div className="flex justify-between">
                      <span>Daily quota</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {quota
                          ? `${quota.dailyUsed}/${quota.dailyLimit}`
                          : "0/50"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                      {remainingDaily} remaining
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeTab === "email" && (
              <MessagesLayout
                list={
                  <ThreadList
                    searchQuery={searchQuery}
                    selectedThreadId={selectedThreadId}
                    onThreadSelect={handleThreadSelect}
                    filter={activeFolder}
                  />
                }
                detail={
                  selectedThreadId ? (
                    <ThreadView
                      threadId={selectedThreadId}
                      onClose={() => setSelectedThreadId(null)}
                    />
                  ) : (
                    <EmptyThreadView />
                  )
                }
              />
            )}

            {activeTab === "slack" && (
              <SlackTabContent selectedChannel={selectedSlackChannel} />
            )}

            {activeTab === "instagram" && (
              <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                  <Instagram className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Instagram DMs coming soon
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Active conversations from the last 30 days
                  </p>
                </div>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Templates coming soon
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Will be migrated from Training Hub
                  </p>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Analytics coming soon
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Track opens, clicks, and delivery rates
                  </p>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Settings coming soon
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Signatures, snippets, and notifications
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Dialog */}
      <ComposeDialog open={isComposeOpen} onOpenChange={setIsComposeOpen} />
    </>
  );
}

// Empty state when no thread is selected
function EmptyThreadView() {
  return (
    <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="text-center">
        <Inbox className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Select a conversation to view
        </p>
      </div>
    </div>
  );
}
