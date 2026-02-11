import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "@/lib/pdf-setup";
import { Loader2 } from "lucide-react";

interface PdfDocumentViewerProps {
  url: string;
}

export function PdfDocumentViewer({ url }: PdfDocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => setNumPages(n),
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

  return (
    <div ref={containerRef} className="space-y-0">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center gap-2 py-20 justify-center text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading PDF...</span>
          </div>
        }
        error={
          <p className="text-xs text-red-500 py-10 text-center">
            Failed to load PDF
          </p>
        }
      >
        {numPages &&
          Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              className="mb-2 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white"
            >
              <Page
                pageNumber={i + 1}
                width={containerWidth}
                renderTextLayer
                renderAnnotationLayer
                loading={
                  <div className="flex items-center gap-2 py-20 justify-center text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                }
              />
            </div>
          ))}
      </Document>

      {numPages && (
        <p className="text-[10px] text-zinc-400 text-center pt-1">
          {numPages} {numPages === 1 ? "page" : "pages"}
        </p>
      )}
    </div>
  );
}
