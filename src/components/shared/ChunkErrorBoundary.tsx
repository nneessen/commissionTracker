// src/components/shared/ChunkErrorBoundary.tsx

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Context name for error messages (e.g., "analytics", "recruiting") */
  context?: string;
  /** Max auto-retry attempts before showing error UI */
  maxRetries?: number;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Detects if an error is a chunk/module loading failure.
 * Common causes: stale deployment, network issues, Vercel SPA rewrite returning HTML for missing JS.
 */
export function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return (
    name === "chunkloaderror" ||
    message.includes("loading chunk") ||
    message.includes("loading css chunk") ||
    message.includes("dynamically imported module") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    // Vercel SPA rewrite returns HTML for missing JS files
    message.includes("text/html") ||
    message.includes("mime type") ||
    // Network failures during chunk fetch
    (message.includes("failed to fetch") &&
      !message.includes("api") &&
      !message.includes("supabase"))
  );
}

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  static defaultProps = {
    context: "application",
    maxRetries: 1,
  };

  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<ChunkErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, maxRetries = 1 } = this.props;
    const { retryCount } = this.state;

    console.error(
      `[ChunkErrorBoundary] Error in ${this.props.context}:`,
      error,
    );

    // Notify parent if callback provided
    onError?.(error, errorInfo);

    // Auto-retry once for chunk errors (handles transient network issues)
    if (isChunkLoadError(error) && retryCount < maxRetries) {
      this.setState({ retryCount: retryCount + 1, isRetrying: true });

      // Small delay before retry to allow network recovery
      setTimeout(() => {
        this.setState({ hasError: false, error: null, isRetrying: false });
      }, 1000);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  handlePageRefresh = () => {
    // Force refresh to get latest index.html with new chunk hashes
    window.location.reload();
  };

  render() {
    const { hasError, error, isRetrying } = this.state;
    const { children, fallback, context } = this.props;

    // Show loading state during auto-retry
    if (isRetrying) {
      return (
        <div className="flex items-center justify-center p-4 text-[11px] text-zinc-500">
          <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
          Retrying...
        </div>
      );
    }

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      const isChunkError = isChunkLoadError(error);

      return (
        <div className="p-3 max-w-md mx-auto">
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-3 w-3" />
            <AlertTitle className="text-[11px] font-semibold">
              {isChunkError ? "Update Available" : "Something went wrong"}
            </AlertTitle>
            <AlertDescription className="text-[10px] mt-1">
              {isChunkError ? (
                <>
                  A new version of the {context} has been deployed. Please
                  refresh to load the latest version.
                </>
              ) : (
                <>
                  An error occurred in the {context}. This might be temporary -
                  please try again.
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Error details in development */}
          {process.env.NODE_ENV === "development" && (
            <details className="mb-3 text-[10px]">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                Error Details
              </summary>
              <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px] overflow-auto max-h-32">
                {error.toString()}
                {"\n"}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-1.5">
            {isChunkError ? (
              // For chunk errors, refresh is the primary action
              <Button
                onClick={this.handlePageRefresh}
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Page
              </Button>
            ) : (
              <>
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handlePageRefresh}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                >
                  Refresh Page
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
