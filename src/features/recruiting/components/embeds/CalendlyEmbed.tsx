// src/features/recruiting/components/embeds/CalendlyEmbed.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendlyEmbedProps {
  url: string;
  onEventScheduled?: () => void;
  className?: string;
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: Record<string, unknown>;
        utm?: Record<string, unknown>;
      }) => void;
    };
  }
}

const CALENDLY_SCRIPT_URL =
  "https://assets.calendly.com/assets/external/widget.js";

export function CalendlyEmbed({
  url,
  onEventScheduled,
  className = "",
}: CalendlyEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const initializeWidget = useCallback(() => {
    if (!containerRef.current || !window.Calendly) return;

    try {
      // Clear any existing content
      containerRef.current.innerHTML = "";

      window.Calendly.initInlineWidget({
        url,
        parentElement: containerRef.current,
      });

      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error("Failed to initialize Calendly widget:", err);
      setError("Failed to load calendar. Please try again.");
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Listen for Calendly events
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://calendly.com") return;

      if (
        event.data.event === "calendly.event_scheduled" ||
        event.data.event === "calendly.event_type_viewed"
      ) {
        if (
          event.data.event === "calendly.event_scheduled" &&
          onEventScheduled
        ) {
          onEventScheduled();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEventScheduled]);

  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector(
      `script[src="${CALENDLY_SCRIPT_URL}"]`,
    );

    if (existingScript && window.Calendly) {
      scriptLoadedRef.current = true;
      initializeWidget();
      return;
    }

    if (existingScript) {
      // Script exists but not yet loaded
      existingScript.addEventListener("load", () => {
        scriptLoadedRef.current = true;
        initializeWidget();
      });
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = CALENDLY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      initializeWidget();
    };

    script.onerror = () => {
      setError("Failed to load Calendly. Please try again.");
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script as other components might use it
    };
  }, [initializeWidget]);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg ${className}`}
      >
        <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center mb-3">
          {error}
        </p>
        <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Open in New Tab
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 rounded-lg z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Loading calendar...
            </span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="calendly-inline-widget min-h-[500px] w-full"
        data-url={url}
      />
    </div>
  );
}
