import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "@/lib/pdf-setup";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlidesPresentationProps {
  url: string;
}

export function SlidesPresentation({ url }: SlidesPresentationProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => setNumPages(n),
    [],
  );

  const goNext = useCallback(
    () => setCurrentPage((p) => Math.min(p + 1, numPages ?? p)),
    [numPages],
  );
  const goPrev = useCallback(
    () => setCurrentPage((p) => Math.max(1, p - 1)),
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-slate-800 flex items-center justify-center"
        style={{ minHeight: 400 }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2 py-20 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading slides...</span>
            </div>
          }
          error={
            <p className="text-xs text-red-400 py-20">Failed to load slides</p>
          }
        >
          <Page
            pageNumber={currentPage}
            width={containerWidth - 32}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="flex items-center gap-2 py-20 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            }
          />
        </Document>
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
        <span className="text-[11px] text-zinc-500 min-w-[80px] text-center">
          {numPages
            ? `Slide ${currentPage} of ${numPages}`
            : `Slide ${currentPage}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={goNext}
          disabled={numPages !== null && currentPage >= numPages}
        >
          Next
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
