// src/components/shared/VersionUpdateDialog.tsx

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function VersionUpdateDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleVersionUpdate = () => {
      setIsOpen(true);
    };

    window.addEventListener("version-update-available", handleVersionUpdate);
    return () => {
      window.removeEventListener(
        "version-update-available",
        handleVersionUpdate,
      );
    };
  }, []);

  const handleRefresh = () => {
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
        variant="elevated"
        size="sm"
        hideCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl"
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
            <RefreshCw className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle
            className="text-xl text-slate-900 dark:text-slate-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Update Available
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 pt-1">
            A new version is available. Refresh to get the latest features and
            fixes.
          </DialogDescription>
        </DialogHeader>
        <Button
          onClick={handleRefresh}
          variant="warning"
          className="w-full mt-2"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
