"use client";

import { useCallback, useOptimistic } from "react";

import { logError } from "@/lib/logging";
import { toast } from "sonner";

export interface UseOptimisticActionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook for optimistic UI updates with immediate feedback
 * Shows changes to the user immediately while the server request completes
 *
 * @example
 * const [optimisticData, addOptimisticUpdate] = useOptimisticAction(
 *   data,
 *   (newData) => serverUpdateFn(newData)
 * );
 *
 * const handleUpdate = () => {
 *   addOptimisticUpdate(newItem, {
 *     successMessage: "Item added!",
 *     onError: (error) => console.error(error)
 *   });
 * };
 */
export function useOptimisticAction<T extends { id: string | number }>(
  initialData: T[],
  serverUpdate: (data: T[]) => Promise<void>,
  options?: UseOptimisticActionOptions
) {
  const [optimisticData, addOptimisticUpdate] = useOptimistic<
    T[],
    { action: "add" | "update" | "delete"; item: T | { id: string | number } }
  >(initialData, (state: T[], update) => {
    switch (update.action) {
      case "add": {
        const item = update.item as T;
        if (!state.find((d) => d.id === item.id)) {
          return [...state, item];
        }
        return state;
      }
      case "update": {
        const item = update.item as T;
        return state.map((d) => (d.id === item.id ? item : d));
      }
      case "delete": {
        const id = (update.item as { id: string | number }).id;
        return state.filter((d) => d.id !== id);
      }
      default:
        return state;
    }
  });

  const executeOptimisticUpdate = useCallback(
    async (
      item: T | { id: string | number },
      action: "add" | "update" | "delete",
      customOptions?: UseOptimisticActionOptions
    ) => {
      const mergedOptions = { ...options, ...customOptions };
      let currentData = optimisticData;

      try {
        // Show optimistic update immediately
        addOptimisticUpdate({ action, item });

        // Compute updated data for server
        switch (action) {
          case "add":
            currentData = [...optimisticData, item as T];
            break;
          case "update":
            currentData = optimisticData.map((d) => (d.id === (item as T).id ? (item as T) : d));
            break;
          case "delete":
            currentData = optimisticData.filter(
              (d) => d.id !== (item as { id: string | number }).id
            );
            break;
        }

        // Execute server update
        await serverUpdate(currentData);

        if (mergedOptions.showToast && mergedOptions.successMessage) {
          toast.success(mergedOptions.successMessage);
        }
        mergedOptions.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logError("[useOptimisticAction]", "Update failed", err);

        if (mergedOptions.showToast && mergedOptions.errorMessage) {
          toast.error(mergedOptions.errorMessage);
        }
        mergedOptions.onError?.(err);
      }
    },
    [optimisticData, addOptimisticUpdate, serverUpdate, options]
  );

  return [optimisticData, executeOptimisticUpdate] as const;
}
