// src/features/chat-bot/components/AppointmentsTab.tsx
// Appointments list with pagination

import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChatBotAppointments } from "../hooks/useChatBot";

export function AppointmentsTab() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useChatBotAppointments(page, limit);

  const appointments = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCreated = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "scheduled":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Scheduled
          </Badge>
        );
      case "completed":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            Cancelled
          </Badge>
        );
      case "no_show":
        return (
          <Badge className="text-[9px] h-3.5 px-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            No Show
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
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-400">
          {total} appointment{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Lead
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Date/Time
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Status
                </TableHead>
                <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                  Created
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
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <Calendar className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      No appointments yet
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                      Appointments will appear when leads book via the bot
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appt) => (
                  <TableRow
                    key={appt.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                  >
                    <TableCell className="py-1.5">
                      <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                        {appt.leadName}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[11px] text-zinc-900 dark:text-zinc-100">
                        {formatDate(appt.scheduledAt)}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        {statusBadge(appt.status)}
                        {appt.eventUrl && (
                          <a
                            href={appt.eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {formatCreated(appt.createdAt)}
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
    </div>
  );
}
