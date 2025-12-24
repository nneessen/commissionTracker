// src/features/recruiting/components/SchedulingBookingModal.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, X } from "lucide-react";
import type { SchedulingIntegrationType } from "@/types/integration.types";
import { INTEGRATION_TYPE_LABELS } from "@/types/integration.types";
import { CalendlyEmbed, GoogleCalendarEmbed, ZoomEmbed } from "./embeds";

interface SchedulingBookingModalProps {
  open: boolean;
  onClose: () => void;
  integrationType: SchedulingIntegrationType;
  bookingUrl: string;
  itemName: string;
  instructions?: string;
  meetingId?: string;
  passcode?: string;
  onBookingComplete?: () => void;
}

export function SchedulingBookingModal({
  open,
  onClose,
  integrationType,
  bookingUrl,
  itemName,
  instructions,
  meetingId,
  passcode,
  onBookingComplete,
}: SchedulingBookingModalProps) {
  const [hasBooked, setHasBooked] = useState(false);

  const handleBookingComplete = () => {
    setHasBooked(true);
    onBookingComplete?.();
  };

  const handleClose = () => {
    setHasBooked(false);
    onClose();
  };

  // Validate URL
  const isValidUrl = bookingUrl && bookingUrl.startsWith("https://");

  const renderEmbed = () => {
    if (!isValidUrl) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg min-h-[300px]">
          <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center mb-3">
            Invalid booking URL. Please contact your recruiter.
          </p>
        </div>
      );
    }

    switch (integrationType) {
      case "calendly":
        return (
          <CalendlyEmbed
            url={bookingUrl}
            onEventScheduled={handleBookingComplete}
            className="min-h-[500px]"
          />
        );
      case "google_calendar":
        return (
          <GoogleCalendarEmbed url={bookingUrl} className="min-h-[500px]" />
        );
      case "zoom":
        return (
          <ZoomEmbed
            url={bookingUrl}
            meetingId={meetingId}
            passcode={passcode}
            instructions={instructions}
            className="min-h-[300px]"
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg min-h-[300px]">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center mb-3">
              Unsupported scheduling type
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              asChild
            >
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Open in New Tab
              </a>
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 bg-white dark:bg-zinc-900 overflow-hidden">
        <DialogHeader className="p-3 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-sm font-semibold">
                {itemName}
              </DialogTitle>
              <DialogDescription className="text-[10px] mt-0.5">
                {INTEGRATION_TYPE_LABELS[integrationType]} Scheduling
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 -mr-1 -mt-1"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Instructions (for Calendly/Google Calendar only) */}
        {instructions && integrationType !== "zoom" && (
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 mx-3 rounded-lg">
            <p className="text-[11px] text-blue-700 dark:text-blue-400">
              {instructions}
            </p>
          </div>
        )}

        {/* Embed Container */}
        <div className="p-3 pt-2">{renderEmbed()}</div>

        {/* Footer with fallback link */}
        <div className="px-3 pb-3 flex items-center justify-between">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {hasBooked
              ? "Booking confirmed! You can close this window."
              : "Having trouble? "}
            {!hasBooked && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-700 dark:text-zinc-300 underline hover:no-underline"
              >
                Open in new tab
              </a>
            )}
          </p>
          {hasBooked && (
            <Button size="sm" className="h-7 text-[11px]" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
