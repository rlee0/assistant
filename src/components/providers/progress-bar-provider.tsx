"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ProgressBar } from "@/components/ui/progress-bar";

interface ProgressBarContextValue {
  start: () => void;
  complete: () => void;
  isLoading: boolean;
}

const ProgressBarContext = createContext<ProgressBarContextValue | null>(null);

export function useProgressBarContext() {
  const context = useContext(ProgressBarContext);
  if (!context) {
    throw new Error("useProgressBarContext must be used within ProgressBarProvider");
  }
  return context;
}

export function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  const start = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(true);
  }, []);

  const complete = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // Auto-complete progress bar when navigation finishes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      complete();
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, searchParams, complete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Track page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Defer state update to avoid updating during Router render
      queueMicrotask(() => start());
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [start]);

  return (
    <ProgressBarContext.Provider value={{ start, complete, isLoading }}>
      <ProgressBar isActive={isLoading} />
      {children}
    </ProgressBarContext.Provider>
  );
}
