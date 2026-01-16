"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import React, { Component, ErrorInfo, ReactNode } from "react";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/logging";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      logError("[ErrorBoundary]", "Caught error", error, { errorInfo });
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                An unexpected error occurred. Please try refreshing the page.
              </AlertDescription>
            </Alert>

            {this.props.showDetails && this.state.error && (
              <div className="rounded-lg border bg-muted p-4">
                <h3 className="mb-2 font-semibold">Error Details:</h3>
                <pre className="overflow-auto text-sm">
                  <code>{this.state.error.toString()}</code>
                </pre>
                {this.state.errorInfo && (
                  <>
                    <h3 className="mb-2 mt-4 font-semibold">Component Stack:</h3>
                    <pre className="overflow-auto text-sm">
                      <code>{this.state.errorInfo.componentStack}</code>
                    </pre>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset}>Try Again</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience hook-like wrapper for functional component patterns
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
}
