// src/features/training-modules/components/presentations/PresentationSubmissionList.tsx
import { useNavigate } from "@tanstack/react-router";
import { Video, Loader2 } from "lucide-react";
import { usePresentationSubmissions } from "../../hooks/usePresentationSubmissions";
import { PresentationStatusBadge } from "./PresentationStatusBadge";
import type { PresentationSubmissionFilters, PresentationSubmission } from "../../types/training-module.types";

interface PresentationSubmissionListProps {
  filters?: PresentationSubmissionFilters;
  showSubmitter?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PresentationSubmissionList({ filters, showSubmitter }: PresentationSubmissionListProps) {
  const { data: submissions = [], isLoading, error } = usePresentationSubmissions(filters);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-red-500">Failed to load submissions</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <Video className="h-5 w-5 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
        <p className="text-xs text-zinc-400">No presentations submitted yet</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
            <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Title</th>
            {showSubmitter && (
              <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Agent</th>
            )}
            <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Week</th>
            <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Type</th>
            <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Size</th>
            <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Status</th>
            <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub: PresentationSubmission) => (
            <tr
              key={sub.id}
              onClick={() => navigate({ to: "/my-training/presentations/$submissionId", params: { submissionId: sub.id } })}
              className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                {sub.title}
              </td>
              {showSubmitter && (
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {sub.submitter
                    ? `${sub.submitter.first_name} ${sub.submitter.last_name}`
                    : "Unknown"}
                </td>
              )}
              <td className="px-3 py-2 text-zinc-500">{formatDate(sub.week_start)}</td>
              <td className="px-3 py-2 text-zinc-500 capitalize">
                {sub.recording_type === "browser_recording" ? "Recording" : "Upload"}
              </td>
              <td className="px-3 py-2 text-zinc-500">{formatSize(sub.file_size)}</td>
              <td className="px-3 py-2">
                <PresentationStatusBadge status={sub.status} />
              </td>
              <td className="px-3 py-2 text-zinc-500">{formatDate(sub.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
