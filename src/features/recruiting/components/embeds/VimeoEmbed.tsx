// src/features/recruiting/components/embeds/VimeoEmbed.tsx

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VimeoEmbedProps {
  videoId: string;
  onComplete?: () => void;
  requireFullWatch?: boolean;
  autoComplete?: boolean;
  className?: string;
}

/** Vimeo Player API type */
interface VimeoPlayer {
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
  destroy?(): void;
}

/** Vimeo error event shape */
interface VimeoErrorEvent {
  message: string;
  name: string;
}

/** Vimeo timeupdate data shape */
interface VimeoTimeUpdateData {
  percent: number;
  seconds: number;
  duration: number;
}

/** Vimeo namespace on window */
interface VimeoNamespace {
  Player: new (element: HTMLIFrameElement) => VimeoPlayer;
}

declare global {
  interface Window {
    Vimeo?: VimeoNamespace;
  }
}

const VIMEO_PLAYER_SCRIPT_URL = "https://player.vimeo.com/api/player.js";
const SCRIPT_LOAD_TIMEOUT = 10000; // 10 seconds

/**
 * Load a script with timeout and error handling
 * @param url - Script URL to load
 * @param globalCheck - Function to check if the global variable is available
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves when script is loaded or rejects on error/timeout
 */
function loadScriptWithTimeout(
  url: string,
  globalCheck: () => boolean,
  timeoutMs: number = SCRIPT_LOAD_TIMEOUT,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (globalCheck()) {
      resolve();
      return;
    }

    // Check if script tag exists
    const existingScript = document.querySelector(`script[src="${url}"]`);

    if (existingScript) {
      // Wait for global to be available
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (globalCheck()) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(`Script load timeout: ${url}`));
        }
      }, 100);
      return;
    }

    // Create new script tag
    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const timeoutId = setTimeout(() => {
      script.remove();
      reject(new Error(`Script load timeout: ${url}`));
    }, timeoutMs);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      script.remove();
      reject(new Error(`Script load failed: ${url}`));
    };

    document.body.appendChild(script);
  });
}

export function VimeoEmbed({
  videoId,
  onComplete,
  requireFullWatch = false,
  autoComplete = false,
  className = "",
}: VimeoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [hasWatchedFull, setHasWatchedFull] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handlersRef = useRef<{
    loaded?: () => void;
    ended?: () => void;
    error?: (e: VimeoErrorEvent) => void;
    timeupdate?: (data: VimeoTimeUpdateData) => void;
  }>({});

  useEffect(() => {
    // Load Vimeo Player API if not already loaded
    const loadPlayer = async () => {
      try {
        await loadScriptWithTimeout(
          VIMEO_PLAYER_SCRIPT_URL,
          () => !!window.Vimeo,
        );

        // Initialize player
        if (containerRef.current && window.Vimeo) {
          const iframe = document.createElement("iframe");
          iframe.src = `https://player.vimeo.com/video/${videoId}?dnt=1`;
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.setAttribute(
            "allow",
            "autoplay; fullscreen; picture-in-picture",
          );

          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(iframe);

          playerRef.current = new window.Vimeo.Player(iframe);

          // Set up event listeners with cleanup tracking
          const handleLoaded = () => {
            setIsLoading(false);
            setError(null);
          };
          handlersRef.current.loaded = handleLoaded;
          playerRef.current.on("loaded", handleLoaded);

          const handleEnded = () => {
            setHasWatchedFull(true);
            if (autoComplete && onCompleteRef.current) {
              onCompleteRef.current();
            }
          };
          handlersRef.current.ended = handleEnded;
          playerRef.current.on("ended", handleEnded);

          const handleError = (e: VimeoErrorEvent) => {
            console.error("Vimeo player error:", e);
            setError("Failed to load video. It may be private or unavailable.");
            setIsLoading(false);
          };
          handlersRef.current.error = handleError;
          playerRef.current.on(
            "error",
            handleError as (...args: unknown[]) => void,
          );

          // Track progress for "require full watch" mode
          if (requireFullWatch) {
            const handleTimeUpdate = (data: VimeoTimeUpdateData) => {
              const progress = (data.percent || 0) * 100;
              setWatchProgress(progress);
              if (progress >= 95) {
                setHasWatchedFull(true);
              }
            };
            handlersRef.current.timeupdate = handleTimeUpdate;
            playerRef.current.on(
              "timeupdate",
              handleTimeUpdate as (...args: unknown[]) => void,
            );
          }
        }
      } catch (err) {
        console.error("Failed to load Vimeo player:", err);
        setError("Failed to load video player. Please refresh the page.");
        setIsLoading(false);
      }
    };

    loadPlayer();

    return () => {
      // Capture ref values inside the effect cleanup to avoid stale closure
      const player = playerRef.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- correctly capturing ref to local var
      const handlers = handlersRef.current;

      // Remove all event listeners before destroying player
      if (player) {
        Object.entries(handlers).forEach(([event, handler]) => {
          if (handler) {
            player.off(event, handler as (...args: unknown[]) => void);
          }
        });

        if (player.destroy) {
          player.destroy();
        }
      }
    };
  }, [videoId, requireFullWatch, autoComplete]);

  const handleManualComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const openInNewTab = () => {
    window.open(`https://vimeo.com/${videoId}`, "_blank");
  };

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}
      >
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-sm text-red-700 dark:text-red-400 mb-4 text-center">
          {error}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={openInNewTab}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open on Vimeo
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="relative flex-1 bg-zinc-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {requireFullWatch && !hasWatchedFull && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400">
          Progress: {Math.round(watchProgress)}% - You must watch the full video
          to complete this item.
        </div>
      )}

      {!autoComplete && hasWatchedFull && onComplete && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handleManualComplete} className="flex-1">
            Mark as Complete
          </Button>
        </div>
      )}

      {!hasWatchedFull && !requireFullWatch && onComplete && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualComplete}
            className="w-full"
          >
            Mark as Complete
          </Button>
        </div>
      )}
    </div>
  );
}
