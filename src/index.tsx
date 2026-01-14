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
                <ReactQueryDevtools initialIsOpen={false} />
              </NotificationProvider>
            </AuthProvider>
          </CustomDomainProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ChunkErrorBoundary>
  </React.StrictMode>,
);
