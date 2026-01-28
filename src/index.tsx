// src/index.tsx

// Auto-reload on stale chunk errors (new deployment while user has old HTML cached)
// This MUST run before any imports to catch dynamic import failures early
window.addEventListener("vite:preloadError", () => {
  // Prevent infinite reload loop - only reload if last attempt was > 10 seconds ago
  const reloadKey = "chunk-reload-timestamp";
  const lastAttempt = sessionStorage.getItem(reloadKey);
  const now = Date.now();

  // Allow reload if no previous attempt OR last attempt was > 10 seconds ago
  if (!lastAttempt || now - parseInt(lastAttempt, 10) > 10000) {
    sessionStorage.setItem(reloadKey, now.toString());
    window.location.reload();
  }
});

// Version polling for automatic update detection
// Checks version.json every 5 minutes and prompts refresh on new deploy
(function setupVersionPolling() {
  const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const MAX_NOTES_TO_SHOW = 5;
  let initialVersion: string | null = null;

  interface ReleaseNote {
    id: string;
    type: "feat" | "fix" | "improve";
    text: string;
  }

  async function checkVersion() {
    try {
      // Add cache-busting query param to bypass any caching
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      const currentVersion = data.v;
      const notes: ReleaseNote[] = data.notes || [];

      // Get last seen note ID from localStorage (persists across sessions)
      const lastSeenNoteId = localStorage.getItem("last-seen-note-id");

      // Find new notes (all notes newer than lastSeenNoteId)
      let newNotes = notes.slice(0, MAX_NOTES_TO_SHOW);
      if (lastSeenNoteId) {
        const seenIndex = notes.findIndex((n) => n.id === lastSeenNoteId);
        if (seenIndex !== -1) {
          // Only show notes before (newer than) the seen one
          newNotes = notes.slice(0, seenIndex);
        }
        // If seenIndex === -1, lastSeenNoteId not in list = show all notes (up to max)
      }

      if (initialVersion === null) {
        // First load - store the version
        initialVersion = currentVersion;
        sessionStorage.setItem("app-version", currentVersion);
      } else if (currentVersion !== initialVersion) {
        // Version changed - new deployment detected
        console.log("[Version Check] New version detected:", currentVersion);

        // Update stored version BEFORE showing banner
        initialVersion = currentVersion;
        sessionStorage.setItem("app-version", currentVersion);

        // Only show dialog if there are new notes the user hasn't seen
        if (newNotes.length > 0) {
          console.log("[Version Check] New notes to show:", newNotes.length);
          window.dispatchEvent(
            new CustomEvent("version-update-available", {
              detail: { notes: newNotes },
            }),
          );
        } else {
          console.log("[Version Check] No new notes to show");
        }
      }
    } catch (_e) {
      // Silently ignore - version.json might not exist in dev
    }
  }

  // Check immediately on load, then every 5 minutes
  if (typeof window !== "undefined") {
    // Try to restore version from session (in case of soft navigation)
    const storedVersion = sessionStorage.getItem("app-version");
    if (storedVersion) {
      initialVersion = storedVersion;
    }

    // Initial check after a short delay (let app render first)
    setTimeout(checkVersion, 3000);

    // Periodic checks
    setInterval(checkVersion, POLL_INTERVAL);

    // Also check when tab becomes visible again
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    });
  }
})();

// CRITICAL: Capture recovery tokens BEFORE Supabase client can process them
// This must run before any other imports to prevent race conditions
(function handleRecoveryRedirect() {
  const hash = window.location.hash;
  const pathname = window.location.pathname;

  // Check if hash contains recovery tokens
  if (hash && hash.includes("type=recovery")) {
    // Store the hash in sessionStorage as backup (Supabase may clear it)
    sessionStorage.setItem("recovery_hash", hash);

    // If not already on the reset-password page or callback page, redirect immediately
    if (
      !pathname.includes("/auth/reset-password") &&
      !pathname.includes("/auth/callback")
    ) {
      // Use replace to avoid back-button issues - this will reload the page
      window.location.replace("/auth/reset-password" + hash);
      return; // Stop execution (page will reload)
    }
  }
})();

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { router } from "./router";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { CustomDomainProvider } from "./contexts/CustomDomainContext";
import { Toaster } from "@/components/ui/sonner";
import { metricsService } from "./services/observability/MetricsService";
import { ChunkErrorBoundary } from "./components/shared/ChunkErrorBoundary";
import { VersionUpdateDialog } from "./components/shared/VersionUpdateDialog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Initialize MetricsService with queryClient for cache monitoring
metricsService.setQueryClient(queryClient);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <ChunkErrorBoundary context="application">
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        storageKey="commission-tracker-theme"
      >
        <QueryClientProvider client={queryClient}>
          <CustomDomainProvider>
            <AuthProvider>
              <NotificationProvider>
                <RouterProvider router={router} />
                <Toaster />
                <VersionUpdateDialog />
                <ReactQueryDevtools initialIsOpen={false} />
              </NotificationProvider>
            </AuthProvider>
          </CustomDomainProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ChunkErrorBoundary>
  </React.StrictMode>,
);
