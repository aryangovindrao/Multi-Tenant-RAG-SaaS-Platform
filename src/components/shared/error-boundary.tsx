"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Hook for Sentry/Datadog/etc.
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center">
        <div className="bg-destructive/10 mb-4 flex size-12 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive size-6" />
        </div>
        <h3 className="text-base font-semibold">Something went wrong</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          An unexpected error occurred while rendering this section.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => this.setState({ error: null })}
        >
          <RotateCcw className="size-4" />
          Try again
        </Button>
      </div>
    );
  }
}
