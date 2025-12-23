// src/features/recruiting/admin/SchedulingItemConfig.tsx

import { useState, useEffect } from "react";
import {
  Calendar,
  CalendarDays,
  Video,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveSchedulingIntegrations } from "@/hooks/integrations";
import type {
  SchedulingIntegrationType,
  SchedulingChecklistMetadata,
} from "@/types/integration.types";
import {
  INTEGRATION_TYPE_LABELS,
  isValidIntegrationUrl,
} from "@/types/integration.types";

interface SchedulingItemConfigProps {
  metadata: SchedulingChecklistMetadata | null;
  onChange: (metadata: SchedulingChecklistMetadata) => void;
}

const INTEGRATION_ICONS: Record<SchedulingIntegrationType, typeof Calendar> = {
  calendly: Calendar,
  google_calendar: CalendarDays,
  zoom: Video,
};

export function SchedulingItemConfig({
  metadata,
  onChange,
}: SchedulingItemConfigProps) {
  const { data: integrations, isLoading } = useActiveSchedulingIntegrations();

  const [schedulingType, setSchedulingType] =
    useState<SchedulingIntegrationType>(
      metadata?.scheduling_type ?? "calendly",
    );
  const [useCustomUrl, setUseCustomUrl] = useState(
    !!metadata?.custom_booking_url,
  );
  const [customUrl, setCustomUrl] = useState(
    metadata?.custom_booking_url ?? "",
  );
  const [instructions, setInstructions] = useState(
    metadata?.instructions ?? "",
  );
  const [urlError, setUrlError] = useState<string | null>(null);

  // Get integration for selected type
  const selectedIntegration = integrations?.find(
    (i) => i.integration_type === schedulingType,
  );

  // Update parent when values change
  useEffect(() => {
    const newMetadata: SchedulingChecklistMetadata = {
      scheduling_type: schedulingType,
      custom_booking_url: useCustomUrl && customUrl ? customUrl : undefined,
      instructions: instructions || undefined,
      integration_id: selectedIntegration?.id,
    };
    onChange(newMetadata);
  }, [
    schedulingType,
    useCustomUrl,
    customUrl,
    instructions,
    selectedIntegration,
    onChange,
  ]);

  const validateCustomUrl = (url: string) => {
    if (!url) {
      setUrlError(null);
      return;
    }
    if (!isValidIntegrationUrl(schedulingType, url)) {
      setUrlError(`Invalid ${INTEGRATION_TYPE_LABELS[schedulingType]} URL`);
    } else {
      setUrlError(null);
    }
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
    validateCustomUrl(url);
  };

  const Icon = INTEGRATION_ICONS[schedulingType];

  return (
    <div className="space-y-3 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Scheduling Configuration
        </span>
      </div>

      {/* Scheduling Type */}
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
          Scheduling Type
        </Label>
        <Select
          value={schedulingType}
          onValueChange={(value: SchedulingIntegrationType) => {
            setSchedulingType(value);
            // Reset custom URL when changing type
            if (useCustomUrl) {
              setCustomUrl("");
              setUrlError(null);
            }
          }}
        >
          <SelectTrigger className="h-7 text-[11px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calendly" className="text-[11px]">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Calendly
              </div>
            </SelectItem>
            <SelectItem value="google_calendar" className="text-[11px]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3 w-3" />
                Google Calendar
              </div>
            </SelectItem>
            <SelectItem value="zoom" className="text-[11px]">
              <div className="flex items-center gap-2">
                <Video className="h-3 w-3" />
                Zoom
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Integration Status */}
      {!isLoading && (
        <div className="space-y-1">
          {selectedIntegration ? (
            <div className="flex items-center gap-2 p-1.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1.5 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
              >
                Connected
              </Badge>
              <span className="text-[10px] text-green-700 dark:text-green-400 truncate flex-1">
                {selectedIntegration.display_name ||
                  selectedIntegration.booking_url}
              </span>
              <a
                href={selectedIntegration.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                No {INTEGRATION_TYPE_LABELS[schedulingType]} integration
                configured.{" "}
                <button
                  type="button"
                  onClick={() => setUseCustomUrl(true)}
                  className="underline hover:no-underline"
                >
                  Use custom URL
                </button>{" "}
                or{" "}
                <a
                  href="/settings"
                  className="underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  configure in Settings
                </a>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Custom URL Toggle & Input */}
      {(useCustomUrl || !selectedIntegration) && (
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
            Custom Booking URL
            {!selectedIntegration && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </Label>
          <Input
            value={customUrl}
            onChange={(e) => handleCustomUrlChange(e.target.value)}
            placeholder={`https://${schedulingType === "zoom" ? "zoom.us/j/..." : schedulingType === "calendly" ? "calendly.com/..." : "calendar.google.com/..."}`}
            className={`h-7 text-[11px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 ${
              urlError ? "border-red-500 dark:border-red-500" : ""
            }`}
          />
          {urlError && <p className="text-[10px] text-red-500">{urlError}</p>}
          {selectedIntegration && useCustomUrl && (
            <button
              type="button"
              onClick={() => {
                setUseCustomUrl(false);
                setCustomUrl("");
                setUrlError(null);
              }}
              className="text-[10px] text-zinc-500 dark:text-zinc-400 underline hover:no-underline"
            >
              Use configured integration instead
            </button>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
          Instructions for Recruit
          <span className="text-zinc-400 dark:text-zinc-500 ml-1">
            (optional)
          </span>
        </Label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g., Please book a 30-minute call at your earliest convenience."
          className="text-[11px] min-h-12 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
        />
      </div>
    </div>
  );
}
