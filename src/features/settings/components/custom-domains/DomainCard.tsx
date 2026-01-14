// Domain Card
// Displays a single custom domain with status and actions

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useVerifyCustomDomain,
  useProvisionCustomDomain,
  useDeleteCustomDomain,
  useCheckDomainStatus,
} from "@/hooks/custom-domains/useCustomDomains";
import { DnsInstructions } from "./DnsInstructions";
import type { CustomDomain } from "@/types/custom-domain.types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/custom-domain.types";

interface DomainCardProps {
  domain: CustomDomain;
}

export function DomainCard({ domain }: DomainCardProps) {
  const [showDns, setShowDns] = useState(domain.status === "pending_dns");
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const verifyDomain = useVerifyCustomDomain();
  const provisionDomain = useProvisionCustomDomain();
  const deleteDomain = useDeleteCustomDomain();
  const checkStatus = useCheckDomainStatus();

  // Polling for provisioning status
  useEffect(() => {
    if (domain.status !== "provisioning") {
      setIsPolling(false);
      setPollCount(0);
      return;
    }

    setIsPolling(true);

    // Backoff intervals: 10s, 20s, 30s, 60s
    const getInterval = (count: number) => {
      if (count < 1) return 10000;
      if (count < 3) return 20000;
      if (count < 6) return 30000;
      if (count < 9) return 60000;
      return null; // Stop after ~3 min
    };

    const interval = getInterval(pollCount);
    if (!interval) {
      setIsPolling(false);
      return;
    }

    const timer = setTimeout(() => {
      checkStatus.mutate(domain.id, {
        onSuccess: () => {
          setPollCount((c) => c + 1);
        },
      });
    }, interval);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.status, pollCount, domain.id]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`https://${domain.hostname}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [domain.hostname]);

  const handleVerify = () => {
    verifyDomain.mutate(domain.id);
  };

  const handleProvision = () => {
    provisionDomain.mutate(domain.id);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${domain.hostname}? This cannot be undone.`,
      )
    ) {
      deleteDomain.mutate(domain.id);
    }
  };

  const handleRetry = () => {
    // For error state, retry verification
    verifyDomain.mutate(domain.id);
  };

  const handleCheckStatus = () => {
    setPollCount(0);
    checkStatus.mutate(domain.id);
  };

  const isLoading =
    verifyDomain.isPending ||
    provisionDomain.isPending ||
    deleteDomain.isPending ||
    checkStatus.isPending;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-900">
              {domain.hostname}
            </span>
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[domain.status]}`}
            >
              {STATUS_LABELS[domain.status]}
            </span>
          </div>

          {domain.status === "active" && (
            <div className="mt-1 flex items-center gap-2">
              <a
                href={`https://${domain.hostname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
              >
                <ExternalLink className="h-3 w-3" />
                Visit
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy URL"}
              </button>
            </div>
          )}
        </div>

        {/* Delete button (visible for deletable statuses) */}
        {["draft", "pending_dns", "verified", "error"].includes(
          domain.status,
        ) && (
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            title="Delete domain"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {domain.last_error && (
        <div className="mt-2 flex items-start gap-2 rounded bg-red-50 p-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{domain.last_error}</p>
        </div>
      )}

      {/* DNS Instructions */}
      {(domain.status === "pending_dns" || domain.status === "error") && (
        <div className="mt-3">
          <button
            onClick={() => setShowDns(!showDns)}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            {showDns ? "Hide" : "Show"} DNS Instructions
          </button>
          {showDns && (
            <DnsInstructions
              hostname={domain.hostname}
              verificationToken={domain.verification_token}
              vercelCname={
                domain.provider_metadata &&
                typeof domain.provider_metadata === "object" &&
                "vercel_cname" in domain.provider_metadata
                  ? (domain.provider_metadata as { vercel_cname?: string })
                      .vercel_cname
                  : null
              }
            />
          )}
        </div>
      )}

      {/* Provisioning Progress */}
      {domain.status === "provisioning" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>SSL certificate is being provisioned...</span>
          {!isPolling && (
            <button
              onClick={handleCheckStatus}
              disabled={isLoading}
              className="ml-auto flex items-center gap-1 text-zinc-600 hover:text-zinc-900"
            >
              <RefreshCw className="h-3 w-3" />
              Check Status
            </button>
          )}
        </div>
      )}

      {/* Vercel Verification Requirements */}
      {domain.provider_metadata &&
        typeof domain.provider_metadata === "object" &&
        "verification" in domain.provider_metadata &&
        Array.isArray(
          (domain.provider_metadata as { verification?: unknown[] })
            .verification,
        ) &&
        (domain.provider_metadata as { verification: unknown[] }).verification
          .length > 0 && (
          <div className="mt-2 rounded bg-amber-50 p-2">
            <p className="text-xs font-medium text-amber-700">
              Vercel requires additional verification:
            </p>
            <ul className="mt-1 space-y-1">
              {(
                domain.provider_metadata as {
                  verification: Array<{
                    type: string;
                    domain: string;
                    value: string;
                  }>;
                }
              ).verification.map((v, i) => (
                <li key={i} className="text-xs text-amber-600">
                  Add {v.type} record:{" "}
                  <code className="bg-amber-100 px-1">{v.domain}</code> →{" "}
                  <code className="bg-amber-100 px-1">{v.value}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        {domain.status === "pending_dns" && (
          <Button
            size="sm"
            onClick={handleVerify}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            {verifyDomain.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            )}
            Verify DNS
          </Button>
        )}

        {domain.status === "verified" && (
          <Button
            size="sm"
            onClick={handleProvision}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            {provisionDomain.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            Provision Domain
          </Button>
        )}

        {domain.status === "error" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            {verifyDomain.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Retry
          </Button>
        )}

        {domain.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {deleteDomain.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-3 w-3" />
            )}
            Remove Domain
          </Button>
        )}
      </div>

      {/* Verification Result */}
      {verifyDomain.isSuccess && !verifyDomain.data.verified && (
        <div className="mt-2 rounded bg-amber-50 p-2">
          <p className="text-xs text-amber-700">{verifyDomain.data.message}</p>
          {verifyDomain.data.expected_record && (
            <p className="mt-1 text-xs text-amber-600">
              Expected TXT record at:{" "}
              <code className="bg-amber-100 px-1">
                {verifyDomain.data.expected_record.name}
              </code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
