"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  readonly isActive?: boolean;
  readonly className?: string;
  readonly onComplete?: () => void;
}

const PROGRESS_CONFIG = {
  INITIAL: 10,
  MAX: 90,
  INTERVAL_MS: 500,
  MIN_INCREMENT: 5,
  MAX_INCREMENT: 15,
  COMPLETE_DELAY_MS: 300,
} as const;

export function ProgressBar({ isActive = false, className, onComplete }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    if (isActive && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setProgress(PROGRESS_CONFIG.INITIAL);

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= PROGRESS_CONFIG.MAX) return PROGRESS_CONFIG.MAX;
          const increment =
            Math.random() * PROGRESS_CONFIG.MAX_INCREMENT + PROGRESS_CONFIG.MIN_INCREMENT;
          return Math.min(prev + increment, PROGRESS_CONFIG.MAX);
        });
      }, PROGRESS_CONFIG.INTERVAL_MS);
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
      }, PROGRESS_CONFIG.COMPLETE_DELAY_MS);
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
