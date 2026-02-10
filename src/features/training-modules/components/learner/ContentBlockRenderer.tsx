import { ExternalLink, FileText, MessageSquare } from "lucide-react";
import type { TrainingLessonContent } from "../../types/training-module.types";

type VideoPlatform = "youtube" | "vimeo" | "loom";

function parseVideoUrl(
  url: string,
): { video_id: string; platform: VideoPlatform } | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    let platform: VideoPlatform | null = null;
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be"))
      platform = "youtube";
    else if (hostname.includes("vimeo.com")) platform = "vimeo";
    else if (hostname.includes("loom.com")) platform = "loom";
    if (!platform) return null;

    let videoId: string | null = null;
    if (platform === "youtube") {
      if (hostname.includes("youtu.be"))
        videoId = parsed.pathname.slice(1) || null;
      else {
        const shorts = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
        videoId = shorts ? shorts[1] : parsed.searchParams.get("v");
      }
    } else if (platform === "vimeo") {
      const m = parsed.pathname.match(/\/(\d+)/);
      videoId = m ? m[1] : null;
    } else if (platform === "loom") {
      const m = parsed.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
      videoId = m ? m[1] : null;
    }
    return videoId ? { video_id: videoId, platform } : null;
  } catch {
    return null;
  }
}

function getEmbedUrl(videoId: string, platform: VideoPlatform): string {
  const id = encodeURIComponent(videoId);
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0`;
    case "vimeo":
      return `https://player.vimeo.com/video/${id}?dnt=1`;
    case "loom":
      return `https://www.loom.com/embed/${id}`;
  }
}

interface ContentBlockRendererProps {
  block: TrainingLessonContent;
}

export function ContentBlockRenderer({ block }: ContentBlockRendererProps) {
  switch (block.content_type) {
    case "rich_text":
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
          <div
            dangerouslySetInnerHTML={{ __html: block.rich_text_content || "" }}
          />
        </div>
      );

    case "video": {
      if (!block.video_url) return null;
      const metadata = parseVideoUrl(block.video_url);
      if (!metadata)
        return <p className="text-xs text-red-500">Invalid video URL</p>;

      const embedUrl = getEmbedUrl(metadata.video_id, metadata.platform);
      return (
        <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {block.title && (
            <div className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-medium">
              {block.title}
            </div>
          )}
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={block.title || "Video"}
            />
          </div>
        </div>
      );
    }

    case "pdf":
      return (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {block.title || "Document"}
            </p>
            <p className="text-[10px] text-zinc-500">PDF document attached</p>
          </div>
        </div>
      );

    case "external_link":
      return (
        <a
          href={block.external_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {block.external_url_label || block.external_url}
            </p>
            {block.external_url_label && (
              <p className="text-[10px] text-zinc-500 truncate">
                {block.external_url}
              </p>
            )}
          </div>
        </a>
      );

    case "script_prompt":
      return (
        <div className="rounded-lg border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300 uppercase">
              Script Practice
            </span>
          </div>
          {block.script_prompt_text && (
            <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {block.script_prompt_text}
            </div>
          )}
          {block.script_prompt_instructions && (
            <div className="text-[11px] text-violet-600 dark:text-violet-400 italic border-t border-violet-200 dark:border-violet-800 pt-2">
              {block.script_prompt_instructions}
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}
