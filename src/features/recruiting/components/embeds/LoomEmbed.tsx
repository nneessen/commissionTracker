// src/features/recruiting/components/embeds/LoomEmbed.tsx

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoomEmbedProps {
  videoId: string;
  onComplete?: () => void;
  className?: string;
}

export function LoomEmbed({
  videoId,
  onComplete,
  className = "",
}: LoomEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);

  const embedUrl = `https://www.loom.com/embed/${videoId}`;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleManualComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const openInNewTab = () => {
    window.open(`https://www.loom.com/share/${videoId}`, "_blank");
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="relative flex-1 bg-zinc-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
            <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
          </div>
        )}
        <iframe
          src={embedUrl}
          frameBorder="0"
          allowFullScreen
          onLoad={handleLoad}
          className="w-full h-full"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          title="Loom video"
        />
      </div>

      <div className="mt-3 flex gap-2">
        {onComplete && (
          <Button size="sm" onClick={handleManualComplete} className="flex-1">
            Mark as Complete
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={openInNewTab}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Loom
        </Button>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
        Note: Loom videos must be manually marked as complete
      </p>
    </div>
  );
}
