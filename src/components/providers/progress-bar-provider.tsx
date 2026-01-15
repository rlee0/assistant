"use client";

import { ProgressBar, useProgressBar } from "@/components/ui/progress-bar";
import { useEffect, useRef } from "react";

export function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, start, complete } = useProgressBar();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleStart = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      start();
    };

    window.addEventListener("beforeunload", handleStart);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [start]);

  return (
    <>
      <ProgressBar
        isActive={isLoading}
        onComplete={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(complete, 1500);
        }}
      />
      {children}
    </>
  );
}
