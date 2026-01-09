// src/features/recruiting/components/embeds/YouTubeEmbed.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface YouTubeEmbedProps {
  videoId: string;
  onComplete?: () => void;
  requireFullWatch?: boolean;
  autoComplete?: boolean;
  className?: string;
}

/** YouTube Player API type */
interface YouTubePlayer {
  getDuration(): number;
  getCurrentTime(): number;
  destroy?(): void;
}

/** YouTube event shape */
interface YouTubeEvent {
  data: number;
}

/** YouTube player config shape */
interface YouTubePlayerConfig {
  videoId: string;
  width: string | number;
  height: string | number;
  playerVars?: {
    autoplay?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    enablejsapi?: 0 | 1;
  };
  events?: {
    onReady?: (event: YouTubeEvent) => void;
    onStateChange?: (event: YouTubeEvent) => void;
    onError?: (event: YouTubeEvent) => void;
  };
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: YouTubePlayerConfig,
      ) => YouTubePlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_API_SCRIPT_URL = "https://www.youtube.com/iframe_api";
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

export function YouTubeEmbed({
  videoId,
  onComplete,
  requireFullWatch = false,
  autoComplete = false,
  className = "",
}: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [hasWatchedFull, setHasWatchedFull] = useState(false);
  const initAttemptedRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const initializePlayer = useCallback(() => {
    if (!containerRef.current || !window.YT || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    try {
      // Create unique player div
      const playerId = `youtube-player-${videoId}`;
      containerRef.current.innerHTML = "";
      const playerDiv = document.createElement("div");
      playerDiv.id = playerId;
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          rel: 0, // Don't show related videos
          modestbranding: 1, // Minimal YouTube branding
          enablejsapi: 1, // Enable JavaScript API
        },
        events: {
          onReady: (_event: YouTubeEvent) => {
            setIsLoading(false);
            setError(null);
          },
          onStateChange: (event: YouTubeEvent) => {
            if (event.data === window.YT?.PlayerState.ENDED) {
              // Video ended
              setHasWatchedFull(true);
              if (autoComplete && onCompleteRef.current) {
                onCompleteRef.current();
              }
            }
            if (event.data === window.YT?.PlayerState.PLAYING) {
              // Track progress for "require full watch" mode
              if (requireFullWatch) {
                // Clear existing interval before creating new one
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                }

                progressIntervalRef.current = setInterval(() => {
                  if (playerRef.current) {
                    const duration = playerRef.current.getDuration();
                    const current = playerRef.current.getCurrentTime();
                    const progress = (current / duration) * 100;
                    setWatchProgress(progress);
                    if (progress >= 95) {
                      setHasWatchedFull(true);
                      if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                        progressIntervalRef.current = null;
                      }
                    }
                  }
                }, 1000);
              }
            }
          },
          onError: (event: YouTubeEvent) => {
            console.error("YouTube player error:", event.data);
            let errorMessage = "Failed to load video.";
            switch (event.data) {
              case 2:
                errorMessage = "Invalid video ID.";
                break;
              case 5:
                errorMessage = "Video player error.";
                break;
              case 100:
                errorMessage = "Video not found or private.";
                break;
              case 101:
              case 150:
                errorMessage = "Video cannot be embedded.";
                break;
            }
            setError(errorMessage);
            setIsLoading(false);
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize YouTube player:", err);
      setError("Failed to load video player. Please try again.");
      setIsLoading(false);
    }
  }, [videoId, requireFullWatch, autoComplete]);

  useEffect(() => {
    const initPlayer = async () => {
      try {
        await loadScriptWithTimeout(YOUTUBE_API_SCRIPT_URL, () => !!window.YT);
        initializePlayer();
      } catch (err) {
        console.error("Failed to load YouTube API:", err);
        setError("Failed to load video player. Please refresh the page.");
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      // Cleanup progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Cleanup player
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [initializePlayer]);

  const handleManualComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const openInNewTab = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
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
          Open on YouTube
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
