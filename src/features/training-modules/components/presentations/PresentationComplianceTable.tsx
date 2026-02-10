// src/features/training-modules/components/presentations/PresentationComplianceTable.tsx
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useWeeklyCompliance } from "../../hooks/usePresentationSubmissions";
import { PresentationStatusBadge } from "./PresentationStatusBadge";
import type { PresentationStatus } from "../../types/training-module.types";

interface PresentationComplianceTableProps {
  agencyId: string;
  weekStart: string;
}

export function PresentationComplianceTable({ agencyId, weekStart }: PresentationComplianceTableProps) {
  const { data: compliance = [], isLoading, error } = useWeeklyCompliance(agencyId, weekStart);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-red-500">Failed to load compliance data</p>
      </div>
    );
  }

  const submitted = compliance.filter((c) => c.submitted).length;
  const total = compliance.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
          Weekly Compliance
        </h3>
        <span className="text-[11px] text-zinc-500">
          {submitted}/{total} submitted
        </span>
      </div>
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Agent</th>
              <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Email</th>
              <th className="text-center px-3 py-1.5 font-medium text-zinc-500">Submitted</th>
              <th className="text-left px-3 py-1.5 font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((row) => (
              <tr
                key={row.userId}
                className={`border-b border-zinc-100 dark:border-zinc-800 ${
                  row.submissionId ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer" : ""
                }`}
                onClick={() => {
                  if (row.submissionId) {
                    navigate({
                      to: "/my-training/presentations/$submissionId",
                      params: { submissionId: row.submissionId },
                    });
                  }
                }}
              >
                <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                  {row.firstName} {row.lastName}
                </td>
                <td className="px-3 py-2 text-zinc-500">{row.email}</td>
                <td className="px-3 py-2 text-center">
                  {row.submitted ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.status ? (
                    <PresentationStatusBadge status={row.status as PresentationStatus} />
                  ) : (
                    <span className="text-[10px] text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {compliance.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-zinc-400">
                  No agents found in this agency
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
