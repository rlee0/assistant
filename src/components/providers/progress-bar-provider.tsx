"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ProgressBar } from "@/components/ui/progress-bar";

/**
 * Context value for progress bar operations
 */
interface ProgressBarContextValue {
  readonly start: () => void;
  readonly complete: () => void;
  readonly isLoading: boolean;
}

/**
 * Provider context - intentionally nullable to enforce hook usage boundary
 */
const ProgressBarContext = createContext<ProgressBarContextValue | null>(null);

/**
 * Hook to access progress bar context with safety check
 * @throws {Error} If used outside ProgressBarProvider
 */
export function useProgressBarContext(): ProgressBarContextValue {
  const context = useContext(ProgressBarContext);
  if (!context) {
    throw new Error("useProgressBarContext must be used within ProgressBarProvider");
  }
  return context;
}

/**
 * Progress bar provider component
 * Manages navigation progress bar state and auto-completion
 *
 * Features:
 * - Auto-complete on route change (pathname/searchParams)
 * - Cleanup of pending timers on unmount
 * - Safe state updates deferred during server renders
 */
export function ProgressBarProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRenderRef = useRef(true);

  /**
   * Start loading state and clear any pending completion timer
   */
  const start = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(true);
  }, []);

  /**
   * Complete loading state and clear any pending completion timer
   */
  const complete = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  /**
   * Auto-complete progress bar after route change
   * Skip first render to avoid completion on initial mount
   */
  useEffect((): (() => void) => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return () => {
        // No cleanup on first render
      };
    }

    // Schedule completion after route change is detected
    timerRef.current = setTimeout(complete, 0);

    return (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pathname, searchParams, complete]);

  /**
   * Cleanup all timers on unmount
   */
  useEffect((): (() => void) => {
    return (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /**
   * Track beforeunload to show progress for navigation
   * Defer state update to avoid conflicts with React render cycle
   */
  useEffect((): (() => void) => {
    const handleBeforeUnload = (): void => {
      // Use queueMicrotask to defer state update after current event handlers
      queueMicrotask(start);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return (): void => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [start]);

  const contextValue: ProgressBarContextValue = { start, complete, isLoading };

  return (
    <ProgressBarContext.Provider value={contextValue}>
      <ProgressBar isActive={isLoading} />
      {children}
    </ProgressBarContext.Provider>
  );
}
