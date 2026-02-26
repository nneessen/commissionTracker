// src/features/chat-bot/components/ConversationsTab.tsx
// Conversation list with message thread viewer

import { useState, useEffect } from "react";
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConversationThread } from "./ConversationThread";
import {
  useChatBotConversations,
  type ChatBotConversation,
} from "../hooks/useChatBot";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "stale", label: "Stale" },
];

export function ConversationsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [selectedConv, setSelectedConv] = useState<ChatBotConversation | null>(
    null,
  );
  const limit = 20;

  const { data, isLoading, refetch } = useChatBotConversations(
    page,
    limit,
    status === "all" ? undefined : status,
  );

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const conversations = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "active":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Completed
          </Badge>
        );
      case "stale":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            Stale
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="text-[9px] h-3.5 px-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {s}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-7 text-[11px] w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-[11px]"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-zinc-400">
            {total} conversation{total !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Lead
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Status
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Last Message
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                  Time
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      No conversations yet
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                      Conversations will appear when leads text in
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv) => (
                  <TableRow
                    key={conv.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer"
                    onClick={() => setSelectedConv(conv)}
                  >
                    <TableCell className="py-1.5">
                      <div>
                        <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                          {conv.leadName}
                        </span>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {conv.leadPhone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {statusBadge(conv.status)}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1 max-w-[200px]">
                        {conv.lastMessagePreview}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-3 w-3 mr-0.5" />
            Previous
          </Button>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      )}

      {/* Thread Dialog */}
      <ConversationThread
        conversation={selectedConv}
        open={!!selectedConv}
        onClose={() => setSelectedConv(null)}
      />
    </div>
  );
}
