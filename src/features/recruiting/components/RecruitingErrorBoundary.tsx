// src/features/recruiting/components/RecruitingErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class RecruitingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and potentially to an error reporting service
    console.error('RecruitingErrorBoundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              An error occurred while loading the recruiting module. This might be temporary, please try refreshing the page.
            </AlertDescription>
          </Alert>

          {this.state.error && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Error Details:</h3>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                {this.state.error.toString()}
              </pre>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mb-4">
              <summary className="cursor-pointer font-semibold mb-2">
                Component Stack (Development Only)
              </summary>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={() => window.location.href = '/recruiting'}
              variant="default"
            >
              Return to Recruiting Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}