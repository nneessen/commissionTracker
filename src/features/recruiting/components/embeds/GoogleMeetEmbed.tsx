// src/features/recruiting/components/embeds/GoogleMeetEmbed.tsx

import { useState } from "react";
import { Video, Copy, ExternalLink, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GoogleMeetEmbedProps {
  url: string;
  meetingCode?: string;
  phoneDialIn?: string;
  instructions?: string;
  className?: string;
}

export function GoogleMeetEmbed({
  url,
  meetingCode,
  phoneDialIn,
  instructions,
  className = "",
}: GoogleMeetEmbedProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Validate URL
  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg ${className}`}
      >
        <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center">
          No Google Meet link provided
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg ${className}`}
    >
      {/* Google Meet Icon */}
      <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
        <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        Google Meet
      </h3>

      {/* Instructions */}
      {instructions && (
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center mb-4 max-w-sm">
          {instructions}
        </p>
      )}

      {/* Meeting Details */}
      <div className="w-full max-w-sm space-y-2 mb-4">
        {/* Meeting Code */}
        {meetingCode && (
          <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg">
            <div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Meeting Code
              </span>
              <p className="text-[11px] font-mono text-zinc-900 dark:text-zinc-100">
                {meetingCode}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => copyToClipboard(meetingCode, "Meeting Code")}
            >
              {copiedField === "Meeting Code" ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </Button>
          </div>
        )}

        {/* Phone Dial-In */}
        {phoneDialIn && (
          <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg">
            <div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Phone Dial-In
              </span>
              <p className="text-[11px] font-mono text-zinc-900 dark:text-zinc-100">
                {phoneDialIn}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => copyToClipboard(phoneDialIn, "Phone Number")}
            >
              {copiedField === "Phone Number" ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Join Button */}
      <Button size="sm" className="h-8 text-[11px]" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Join Google Meet
        </a>
      </Button>

      {/* Copy Link */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-[10px] mt-2 text-zinc-500"
        onClick={() => copyToClipboard(url, "Link")}
      >
        {copiedField === "Link" ? (
          <>
            <Check className="h-3 w-3 mr-1 text-green-500" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3 w-3 mr-1" />
            Copy Link
          </>
        )}
      </Button>
    </div>
  );
}
