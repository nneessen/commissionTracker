// src/features/training-modules/components/learner/ContentBlockRenderer.tsx
import { useState, useCallback } from "react";
import { ExternalLink, FileText, MessageSquare, Presentation, Download, Eye, ChevronLeft, ChevronRight, Volume2, Loader2, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrainingDocument, useTrainingDocumentUrl } from "@/features/training-hub/hooks/useTrainingDocuments";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { useElevenLabsAvailable } from "../../hooks/useElevenLabsAvailable";
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
      return <PdfBlockRenderer block={block} />;

    case "slides":
      return <SlidesBlockRenderer block={block} />;

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
      return <ScriptPromptRenderer block={block} />;

    default:
      return null;
  }
}

/**
 * PDF block renderer: shows document name + view/download buttons with inline preview
 */
function PdfBlockRenderer({ block }: { block: TrainingLessonContent }) {
  const { data: doc } = useTrainingDocument(block.document_id || undefined);
  const { data: signedUrl } = useTrainingDocumentUrl(doc?.storagePath || null);
  const [showPreview, setShowPreview] = useState(false);

  if (!block.document_id || !doc) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {block.title || "Document"}
          </p>
          <p className="text-[10px] text-zinc-500">PDF document not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{doc.name}</p>
          <p className="text-[10px] text-zinc-500">
            {((doc.fileSize || 0) / 1024).toFixed(0)} KB
          </p>
        </div>
        <div className="flex items-center gap-1">
          {signedUrl && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showPreview ? "Hide" : "Preview"}
              </Button>
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {showPreview && signedUrl && (
        <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          <iframe
            src={signedUrl}
            className="w-full"
            style={{ height: "500px" }}
            title={doc.name}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Slides block renderer: PDF pages displayed as navigable slides via iframe.
 */
function SlidesBlockRenderer({ block }: { block: TrainingLessonContent }) {
  const { data: doc } = useTrainingDocument(block.document_id || undefined);
  const { data: signedUrl } = useTrainingDocumentUrl(doc?.storagePath || null);
  const [currentPage, setCurrentPage] = useState(1);

  const goNext = useCallback(() => setCurrentPage((p) => p + 1), []);
  const goPrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);

  if (!block.document_id || !doc) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <Presentation className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <p className="text-xs text-zinc-500">Slides not available</p>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <Presentation className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <p className="text-xs text-zinc-400">Loading slides...</p>
      </div>
    );
  }

  const pdfUrl = `${signedUrl}#page=${currentPage}`;

  return (
    <div className="space-y-2">
      {block.title && (
        <div className="flex items-center gap-1.5">
          <Presentation className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[11px] font-medium">{block.title}</span>
        </div>
      )}
      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <iframe
          src={pdfUrl}
          className="w-full bg-white"
          style={{ height: "500px" }}
          title={doc.name || "Slides"}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={goPrev}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-3 w-3 mr-0.5" />
          Prev
        </Button>
        <span className="text-[11px] text-zinc-500 min-w-[40px] text-center">
          Page {currentPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={goNext}
        >
          Next
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Script prompt renderer with optional TTS "Listen" button
 */
function ScriptPromptRenderer({ block }: { block: TrainingLessonContent }) {
  const ttsAvailable = useElevenLabsAvailable();
  const tts = useTextToSpeech(block.script_prompt_text || "");

  return (
    <div className="rounded-lg border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300 uppercase">
            Script Practice
          </span>
        </div>
        {ttsAvailable && block.script_prompt_text && (
          <TtsButton state={tts.state} onPlay={tts.play} onPause={tts.pause} onResume={tts.resume} onStop={tts.stop} />
        )}
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
      {tts.error && (
        <p className="text-[10px] text-red-500">{tts.error}</p>
      )}
    </div>
  );
}

function TtsButton({ state, onPlay, onPause, onResume, onStop }: {
  state: "idle" | "loading" | "playing" | "paused";
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  switch (state) {
    case "idle":
      return (
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-violet-600 dark:text-violet-400" onClick={onPlay}>
          <Volume2 className="h-3 w-3 mr-1" />
          Listen
        </Button>
      );
    case "loading":
      return (
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" disabled>
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Loading...
        </Button>
      );
    case "playing":
      return (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onPause}>
            <Pause className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onStop}>
            <Square className="h-3 w-3" />
          </Button>
        </div>
      );
    case "paused":
      return (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-violet-600 dark:text-violet-400" onClick={onResume}>
            <Volume2 className="h-3 w-3 mr-1" />
            Resume
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onStop}>
            <Square className="h-3 w-3" />
          </Button>
        </div>
      );
  }
}
