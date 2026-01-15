"use client";

import { useProgressBarContext } from "@/components/providers/progress-bar-provider";

/**
 * Hook to manually control the global progress bar.
 *
 * Use this for async operations like form submissions, data mutations,
 * or other user interactions that require visual feedback.
 *
 * Navigation progress is handled automatically by the ProgressBarProvider.
 *
 * @example
 * ```tsx
 * const { startProgress, completeProgress } = useManualProgress();
 *
 * async function handleSubmit() {
 *   startProgress();
 *   try {
 *     await submitForm();
 *   } finally {
 *     completeProgress();
 *   }
 * }
 * ```
 */
export function useManualProgress() {
  const { start, complete } = useProgressBarContext();

  return {
    startProgress: start,
    completeProgress: complete,
  };
}
