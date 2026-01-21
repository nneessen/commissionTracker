// src/features/recruiting/components/onboarding/DocumentsSection.tsx
// Brutalist documents section wrapping DocumentManager

import { FileText } from "lucide-react";
import { DocumentManager } from "../DocumentManager";
import type { UserDocument } from "@/types/recruiting.types";

interface DocumentsSectionProps {
  userId: string;
  documents?: UserDocument[];
  isUpline?: boolean;
  currentUserId: string;
}

export function DocumentsSection({
  userId,
  documents,
  isUpline = false,
  currentUserId,
}: DocumentsSectionProps) {
  const uploadedCount =
    documents?.filter((d) => d.storage_path || d.status === "approved")
      ?.length || 0;
  const totalCount = documents?.length || 0;

  return (
    <section className="relative bg-[#0a0a0a] overflow-hidden rounded-lg">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: "var(--recruiting-primary)", opacity: 0.4 }}
      />

      <div className="relative z-10 p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
            [05] Documents
          </span>

          {/* Progress badge */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-xl md:text-2xl font-black"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color:
                    uploadedCount === totalCount
                      ? "var(--recruiting-primary)"
                      : "white",
                  opacity: uploadedCount === totalCount ? 1 : 0.5,
                }}
              >
                {uploadedCount}
                <span className="text-white/30 text-base md:text-lg">
                  /{totalCount}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {(!documents || documents.length === 0) && (
          <div className="py-6 md:py-8 text-center border border-dashed border-white/10 rounded">
            <FileText
              className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 md:mb-3"
              style={{ color: "var(--recruiting-primary)", opacity: 0.5 }}
            />
            <p className="text-white/30 text-xs md:text-sm font-mono">
              No documents required yet
            </p>
          </div>
        )}

        {/* Document manager wrapper - override styles for dark theme */}
        {documents && documents.length > 0 && (
          <div className="recruiting-docs-wrapper [&_.bg-white]:bg-transparent [&_.dark\\:bg-zinc-900]:bg-transparent [&_.border-zinc-200]:border-white/10 [&_.dark\\:border-zinc-800]:border-white/10 [&_.text-zinc-900]:text-white [&_.dark\\:text-zinc-100]:text-white [&_.text-zinc-500]:text-white/40 [&_.dark\\:text-zinc-400]:text-white/40 [&_.bg-zinc-50]:bg-white/5 [&_.dark\\:bg-zinc-800\\/50]:bg-white/5 [&_.hover\\:bg-zinc-50]:hover:bg-white/10 [&_.dark\\:hover\\:bg-zinc-800]:hover:bg-white/10">
            <DocumentManager
              userId={userId}
              documents={documents}
              isUpline={isUpline}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>
    </section>
  );
}
