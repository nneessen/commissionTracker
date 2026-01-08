// src/features/messages/components/linkedin/LinkedInConnectCard.tsx
// CTA card shown when user has no LinkedIn integration via Unipile

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Linkedin, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface LinkedInConnectCardProps {
  onConnect: () => void;
  isConnecting: boolean;
  /** Error message from failed connection attempt */
  error?: string | null;
  /** Callback to clear the error */
  onClearError?: () => void;
}

export function LinkedInConnectCard({
  onConnect,
  isConnecting,
  error,
  onClearError,
}: LinkedInConnectCardProps): ReactNode {
  return (
    <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="max-w-sm w-full p-6 text-center">
        {/* LinkedIn Icon with gradient background */}
        <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4 shadow-lg">
          <Linkedin className="h-7 w-7 text-white" />
        </div>

        {/* Title and description */}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Connect LinkedIn
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4">
          Connect your LinkedIn account to send and receive DMs directly from
          this dashboard.
        </p>

        {/* How it works box */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-md p-3 mb-4 text-left">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
            How it works
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Sign in with your LinkedIn credentials
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Sync your conversations automatically
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Send and receive messages in real-time
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-red-700 dark:text-red-300">
                  Connection failed
                </p>
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                  {error}
                </p>
              </div>
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onConnect}
            disabled={isConnecting}
            className="flex-1 h-8 text-[11px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Linkedin className="h-3 w-3 mr-1.5" />
                Connect LinkedIn
              </>
            )}
          </Button>
        </div>

        {/* Security note */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Your LinkedIn credentials are securely handled by our partner and
            never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
