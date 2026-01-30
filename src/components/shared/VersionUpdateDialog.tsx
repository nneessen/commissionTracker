// src/components/shared/VersionUpdateDialog.tsx

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, Wrench, TrendingUp } from "lucide-react";

interface ReleaseNote {
  id: string;
  type: "feat" | "fix" | "improve";
  text: string;
}

function getNoteIcon(type: ReleaseNote["type"]) {
  switch (type) {
    case "feat":
      return <Sparkles className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />;
    case "fix":
      return <Wrench className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />;
    case "improve":
      return (
        <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
      );
  }
}

function getNoteLabel(type: ReleaseNote["type"]): string {
  switch (type) {
    case "feat":
      return "New";
    case "fix":
      return "Fixed";
    case "improve":
      return "";
  }
}

export function VersionUpdateDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    const handleVersionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ notes: ReleaseNote[] }>;
      const newNotes = customEvent.detail?.notes || [];
      setNotes(newNotes);
      setIsOpen(true); // Always open on version change
    };

    window.addEventListener(
      "version-update-available",
      handleVersionUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        "version-update-available",
        handleVersionUpdate as EventListener,
      );
    };
  }, []);

  const handleRefresh = () => {
    // Mark newest note as seen (first in array = newest)
    if (notes.length > 0) {
      localStorage.setItem("last-seen-note-id", notes[0].id);
    }
    sessionStorage.removeItem("app-version");
    window.location.href =
      window.location.pathname + "?_v=" + Date.now().toString();
  };

  // Prevent closing - always keep open when visible
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    }
    // Ignore close attempts - dialog is persistent
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden bg-background border-0 shadow-2xl ring-0 outline-none max-w-sm"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Update Available</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            New Update Available
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            A new version has been deployed. Refresh to get the latest features
            and improvements.
          </p>

          {notes.length > 0 && (
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  What's New
                </span>
              </div>
              <ul className="space-y-1.5">
                {notes.map((note) => {
                  const label = getNoteLabel(note.type);
                  return (
                    <li
                      key={note.id}
                      className="flex items-start gap-2 text-xs text-foreground"
                    >
                      {getNoteIcon(note.type)}
                      <span>
                        {label && (
                          <span className="font-medium">{label}: </span>
                        )}
                        {note.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-800/30">
          <Button
            onClick={handleRefresh}
            size="sm"
            className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Refresh Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
