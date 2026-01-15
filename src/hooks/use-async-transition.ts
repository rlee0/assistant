import { useCallback, useEffect, useRef, useTransition } from "react";

import { logError } from "@/lib/logging";

interface UseAsyncTransitionResult<T> {
  isPending: boolean;
  execute: (
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => Promise<T | null>;
}

export function useAsyncTransition<T = unknown>(): UseAsyncTransitionResult<T> {
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async <R>(
      asyncFn: () => Promise<R>,
      onSuccess?: (result: R) => void,
      onError?: (error: Error) => void
    ): Promise<R | null> => {
      if (!asyncFn) {
        const err = new Error("asyncFn is required");
        onError?.(err);
        return null;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      let result: R | null = null;

      await new Promise<void>((resolve) => {
        startTransition(async () => {
          try {
            result = await asyncFn();
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            onSuccess?.(result);
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              return;
            }
            const err = error instanceof Error ? error : new Error(String(error));
            logError("[useAsyncTransition]", "Async operation failed", err);
            onError?.(err);
          } finally {
            resolve();
          }
        });
      });

      return result;
    },
    []
  );

  return {
    isPending,
    execute,
  };
}

interface UseFormTransitionResult {
  isPending: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function useFormTransition(
  onSubmit: (formData: FormData) => Promise<void>
): UseFormTransitionResult {
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (isPending) {
        e.preventDefault();
        return;
      }

      if (!onSubmit) {
        logError("[useFormTransition]", "onSubmit is required", new Error("onSubmit missing"));
        e.preventDefault();
        return;
      }

      e.preventDefault();
      const form = e.currentTarget;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const formData = new FormData(form);

      startTransition(async () => {
        try {
          await onSubmit(formData);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          logError("[useFormTransition]", "Form submission failed", error);
          throw error;
        }
      });
    },
    [isPending, onSubmit]
  );

  return { isPending, handleSubmit };
}
