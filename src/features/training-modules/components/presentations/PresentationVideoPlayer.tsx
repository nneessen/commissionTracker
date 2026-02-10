// src/features/training-modules/components/presentations/PresentationVideoPlayer.tsx
import { Loader2 } from "lucide-react";
import { usePresentationSignedUrl } from "../../hooks/usePresentationSubmissions";

interface PresentationVideoPlayerProps {
  storagePath: string;
  mimeType?: string;
}

export function PresentationVideoPlayer({ storagePath, mimeType }: PresentationVideoPlayerProps) {
  const { data: signedUrl, isLoading, error } = usePresentationSignedUrl(storagePath);

  if (isLoading) {
    return (
      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-xs text-zinc-500">Failed to load video</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
      <video
        controls
        className="w-full aspect-video bg-black"
        preload="metadata"
      >
        <source src={signedUrl} type={mimeType || "video/mp4"} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
