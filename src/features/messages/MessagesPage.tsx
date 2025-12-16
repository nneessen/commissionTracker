// src/features/messages/MessagesPage.tsx
// Communications Hub - Main page matching app design system

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessagesLayout } from "./components/layout/MessagesLayout";
import { ThreadList } from "./components/inbox/ThreadList";
import { ThreadView } from "./components/thread/ThreadView";
import { ComposeDialog } from "./components/compose/ComposeDialog";
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
  Tag,
  Zap,
  Mail,
  MessageSquare,
  Instagram,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabType =
  | "inbox"
  | "sent"
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
  const [activeTab, setActiveTab] = useState<TabType>("inbox");
  const [activeFolder, setActiveFolder] = useState<FolderType>("all");

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleComposeNew = () => {
    setIsComposeOpen(true);
  };

  // Tab configuration - Email, Slack, Instagram, Templates, Analytics, Settings
  const tabs: { id: TabType; label: string; icon: typeof Inbox }[] = [
    { id: "inbox", label: "Email", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "slack", label: "Slack", icon: MessageSquare },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Folder configuration for sidebar
  const folders: {
    id: FolderType;
    label: string;
    icon: typeof Inbox;
    count?: number;
  }[] = [
    { id: "all", label: "All Messages", icon: Mail, count: 0 },
    { id: "inbox", label: "Inbox", icon: Inbox, count: 0 },
    { id: "sent", label: "Sent", icon: Send, count: 0 },
    { id: "starred", label: "Starred", icon: Star, count: 0 },
    { id: "archived", label: "Archived", icon: Archive, count: 0 },
  ];

  return (
    <>
      <div className="flex flex-col" style={{ height: "calc(100vh - 3rem)" }}>
        {/* Page Header - matching Expenses/Targets/Dashboard */}
        <div className="flex-shrink-0 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Messages
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Communications hub • 0 unread
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-48 pl-7 text-xs"
                />
              </div>
              <Button
                onClick={handleComposeNew}
                size="sm"
                className="h-7 px-3 text-[11px]"
              >
                <PenSquare className="h-3 w-3 mr-1.5" />
                Compose
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-3 pb-3 overflow-hidden min-h-0">
          <div className="h-full flex gap-2">
            {/* Left Sidebar - Folders */}
            <Card className="w-48 flex-shrink-0 flex flex-col overflow-hidden">
              <CardContent className="p-2 flex-1 flex flex-col min-h-0 overflow-auto">
                {/* Folders */}
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">
                  Folders
                </div>
                <div className="space-y-0.5">
                  {folders.map((folder) => {
                    const Icon = folder.icon;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setActiveFolder(folder.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
                          activeFolder === folder.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="flex-1 text-left">{folder.label}</span>
                        {folder.count !== undefined && folder.count > 0 && (
                          <span className="text-[10px] font-medium">
                            {folder.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Labels section */}
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 mt-4 mb-2">
                  Labels
                </div>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Create label</span>
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Quota section */}
                <div className="border-t pt-2 mt-2">
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Daily quota</span>
                      <span className="font-medium text-foreground">
                        0 / 50
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: "0%" }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground/70">
                      Resets at midnight
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-6 mt-2 text-[10px] gap-1 bg-primary/10 text-primary hover:bg-primary/20"
                    onClick={() => console.log("Upgrade clicked")}
                  >
                    <Zap className="h-3 w-3" />
                    Upgrade
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
              {/* Tabs - styled like filter buttons */}
              <Card>
                <CardContent className="p-2">
                  <div className="flex gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className={cn(
                            "h-7 px-3 text-[11px] flex items-center gap-1.5 rounded-md transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-foreground hover:bg-muted",
                          )}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden min-h-0">
                {activeTab === "inbox" && (
                  <MessagesLayout
                    list={
                      <ThreadList
                        labelId={null}
                        searchQuery={searchQuery}
                        selectedThreadId={selectedThreadId}
                        onThreadSelect={handleThreadSelect}
                        filter="inbox"
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

                {activeTab === "sent" && (
                  <MessagesLayout
                    list={
                      <ThreadList
                        labelId={null}
                        searchQuery={searchQuery}
                        selectedThreadId={selectedThreadId}
                        onThreadSelect={handleThreadSelect}
                        filter="sent"
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
                  <Card className="h-full">
                    <CardContent className="p-3 h-full flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[11px] text-muted-foreground">
                          Slack integration coming soon
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          Access channels, DMs, and team conversations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "instagram" && (
                  <Card className="h-full">
                    <CardContent className="p-3 h-full flex items-center justify-center">
                      <div className="text-center">
                        <Instagram className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[11px] text-muted-foreground">
                          Instagram DMs coming soon
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          Active conversations from the last 30 days
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "templates" && (
                  <Card className="h-full">
                    <CardContent className="p-3 h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[11px] text-muted-foreground">
                          Templates coming soon
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          Will be migrated from Training Hub
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "analytics" && (
                  <Card className="h-full">
                    <CardContent className="p-3 h-full flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[11px] text-muted-foreground">
                          Analytics coming soon
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          Track opens, clicks, and delivery rates
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "settings" && (
                  <Card className="h-full">
                    <CardContent className="p-3 h-full flex items-center justify-center">
                      <div className="text-center">
                        <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[11px] text-muted-foreground">
                          Settings coming soon
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          Signatures, snippets, and notifications
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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
    <Card className="h-full">
      <CardContent className="h-full flex items-center justify-center p-3">
        <div className="text-center">
          <Inbox className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-[11px] text-muted-foreground">
            Select a conversation to view
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
