// src/features/recruiting/components/interactive/SignatureRequiredItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle2,
  PenTool,
  Clock,
  AlertCircle,
  Users,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { SignatureRequiredMetadata } from "@/types/signature.types";
import type { SignatureResponse } from "@/types/recruiting.types";
import {
  useSubmissionByChecklistProgress,
  useCreateSignatureSubmission,
} from "@/hooks/signatures";
import { useAgencyWithOwner } from "@/hooks/imo";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { SIGNER_ROLE_LABELS } from "@/types/signature.types";

interface SignatureRequiredItemProps {
  progressId: string;
  metadata: SignatureRequiredMetadata;
  existingResponse?: SignatureResponse | null;
  recruitId: string;
  recruitEmail: string;
  recruitName: string;
  onComplete?: () => void;
}

import type { SubmissionStatus } from "@/types/signature.types";

type StatusConfig = {
  label: string;
  color: string;
  icon: typeof PenTool;
};

const STATUS_CONFIG: Record<SubmissionStatus, StatusConfig> = {
  pending: {
    label: "Pending Signatures",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  completed: {
    label: "Completed",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
  },
  voided: {
    label: "Voided",
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    icon: XCircle,
  },
};

export function SignatureRequiredItem({
  progressId,
  metadata,
  existingResponse,
  recruitId,
  recruitEmail,
  recruitName,
  onComplete,
}: SignatureRequiredItemProps) {
  const { user } = useAuth();
  const { agency } = useImo();
  const [isInitiating, setIsInitiating] = useState(false);

  // Fetch agency with owner info for agency_owner role
  const { data: agencyWithOwner } = useAgencyWithOwner(agency?.id);

  const { data: submission, isLoading: submissionLoading } =
    useSubmissionByChecklistProgress(progressId, {
      enabled: !existingResponse,
    });

  const createSubmission = useCreateSignatureSubmission();

  const handleInitiateSignature = useCallback(async () => {
    if (!user || !agency) {
      toast.error("Unable to initiate signature request");
      return;
    }

    setIsInitiating(true);
    try {
      // Get user display name from email (first part before @)
      const getUserName = (email: string | undefined): string => {
        if (!email) return "";
        return email.split("@")[0];
      };

      // Build submitter list based on required signer roles
      const submitters = metadata.required_signer_roles.map((role, index) => {
        if (role === "recruit") {
          return {
            role,
            email: recruitEmail,
            name: recruitName,
            userId: recruitId,
            signingOrder:
              metadata.signing_order === "sequential" ? index + 1 : undefined,
          };
        } else if (role === "recruiter") {
          // The current user is the recruiter initiating the request
          return {
            role,
            email: user.email || "",
            name: getUserName(user.email),
            userId: user.id,
            signingOrder:
              metadata.signing_order === "sequential" ? index + 1 : undefined,
          };
        } else if (role === "agency_owner") {
          // Use actual agency owner from fetched data
          const owner = agencyWithOwner?.owner;
          if (owner) {
            const ownerName =
              [owner.first_name, owner.last_name].filter(Boolean).join(" ") ||
              getUserName(owner.email);
            return {
              role,
              email: owner.email || "",
              name: ownerName,
              userId: owner.id,
              signingOrder:
                metadata.signing_order === "sequential" ? index + 1 : undefined,
            };
          }
          // Fallback to current user if owner not loaded (shouldn't happen)
          return {
            role,
            email: user.email || "",
            name: getUserName(user.email),
            userId: user.id,
            signingOrder:
              metadata.signing_order === "sequential" ? index + 1 : undefined,
          };
        }
        return {
          role,
          email: "",
          name: "",
          signingOrder:
            metadata.signing_order === "sequential" ? index + 1 : undefined,
        };
      });

      await createSubmission.mutateAsync({
        templateId: metadata.template_id,
        agencyId: agency.id,
        targetUserId: recruitId,
        checklistProgressId: progressId,
        initiatedBy: user.id,
        expiresAt: metadata.expires_in_days
          ? new Date(
              Date.now() + metadata.expires_in_days * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined,
        submitters,
      });

      toast.success("Signature request initiated");
      onComplete?.();
    } catch (error) {
      console.error("Failed to initiate signature request:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initiate signature request",
      );
    } finally {
      setIsInitiating(false);
    }
  }, [
    user,
    agency,
    agencyWithOwner,
    metadata,
    recruitId,
    recruitEmail,
    recruitName,
    progressId,
    createSubmission,
    onComplete,
  ]);

  // Loading state
  if (submissionLoading && !existingResponse) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading signature status...</span>
        </div>
      </Card>
    );
  }

  // Determine current status from response or submission
  const currentStatus =
    existingResponse?.submission_status || submission?.status;
  const signersCompleted = existingResponse?.signers_completed || 0;
  const signersTotal =
    existingResponse?.signers_total || metadata.required_signer_roles.length;

  // If completed, show success state
  if (currentStatus === "completed") {
    return (
      <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                All Signatures Complete
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                {signersTotal} of {signersTotal} signers completed
              </p>
            </div>
          </div>
          {existingResponse?.completed_at && (
            <span className="text-xs text-emerald-600/60 dark:text-emerald-400/60">
              Completed{" "}
              {new Date(existingResponse.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </Card>
    );
  }

  // If no submission yet, show initiate button
  if (!currentStatus) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <PenTool className="h-5 w-5 text-zinc-400 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              E-Signature Required
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              This document requires signatures from the following parties:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {metadata.required_signer_roles.map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[10px] py-0.5"
                >
                  <Users className="h-2.5 w-2.5 mr-1" />
                  {SIGNER_ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>
            {metadata.custom_message && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                "{metadata.custom_message}"
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handleInitiateSignature}
          disabled={isInitiating || createSubmission.isPending}
          className="w-full"
        >
          {(isInitiating || createSubmission.isPending) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          <Send className="h-4 w-4 mr-2" />
          {metadata.auto_send
            ? "Send Signature Request"
            : "Initiate Signature Request"}
        </Button>

        {metadata.expires_in_days && (
          <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500">
            Request will expire in {metadata.expires_in_days} days after sending
          </p>
        )}
      </Card>
    );
  }

  // In-progress state
  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="p-4 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5 text-zinc-500" />
          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Users className="h-3 w-3" />
          <span>
            {signersCompleted} / {signersTotal} signed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(signersCompleted / signersTotal) * 100}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Waiting for remaining signatures...
        </p>
      </div>

      {/* Signer Status */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Required Signers
        </p>
        <div className="space-y-1">
          {metadata.required_signer_roles.map((role, index) => {
            const hasSigned = index < signersCompleted;
            return (
              <div
                key={role}
                className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded text-xs"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {SIGNER_ROLE_LABELS[role]}
                </span>
                {hasSigned ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
        Signers will receive email notifications to complete their signatures.
        This item will be marked complete when all parties have signed.
      </p>
    </Card>
  );
}
