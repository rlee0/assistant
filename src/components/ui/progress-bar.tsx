"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  isActive?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function ProgressBar({ isActive = false, className, onComplete }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    if (isActive && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setProgress(10);

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 20 + 10;
        });
      }, 800);
    } else if (!isActive && hasStartedRef.current) {
      hasStartedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setProgress(100);

      timeoutRef.current = setTimeout(() => {
        setProgress(0);
        onComplete?.();
      }, 500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isActive, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {progress > 0 && (
        <motion.div
          key="progress-bar"
          className={cn(
            "fixed top-0 left-0 h-1 bg-linear-to-r from-blue-500 to-cyan-500 shadow-lg z-50",
            className
          )}
          initial={{ opacity: 0, width: "0%" }}
          animate={{
            opacity: 1,
            width: `${Math.min(progress, 100)}%`,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.3 },
            width: { type: "spring", stiffness: 100, damping: 20 },
          }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage progress bar state
 */
export function useProgressBar() {
  const [isLoading, setIsLoading] = useState(false);

  return {
    isLoading,
    start: () => setIsLoading(true),
    complete: () => setIsLoading(false),
  };
}
