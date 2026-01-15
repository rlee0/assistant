import { useCallback, useOptimistic } from "react";

import { logError } from "@/lib/logging";

type OptimisticAction<T> = {
  action: "add" | "update" | "delete";
  item: T | { id: string | number };
};

interface UseOptimisticUpdateResult<T> {
  data: T[];
  add: (item: T) => Promise<void>;
  update: (item: T) => Promise<void>;
  delete: (id: string | number) => Promise<void>;
}

export function useOptimisticUpdate<T extends { id: string | number }>(
  initialData: T[],
  onServerUpdate: (data: T[]) => Promise<void>
): UseOptimisticUpdateResult<T> {
  const [optimisticData, addOptimisticUpdate] = useOptimistic(
    initialData,
    (state: T[], update: OptimisticAction<T>) => {
      switch (update.action) {
        case "add": {
          const item = update.item as T;
          return [...state, item];
        }
        case "update": {
          const item = update.item as T;
          return state.map((existing) => (existing.id === item.id ? item : existing));
        }
        case "delete": {
          const { id } = update.item as { id: string | number };
          return state.filter((existing) => existing.id !== id);
        }
        default: {
          const _exhaustive: never = update.action;
          return _exhaustive;
        }
      }
    }
  );

  const add = useCallback(
    async (item: T): Promise<void> => {
      if (!item?.id) {
        const err = new Error("Item must have an id");
        logError("[useOptimisticUpdate]", "Invalid item for add", err);
        throw err;
      }
      addOptimisticUpdate({ action: "add", item });
      try {
        await onServerUpdate([...optimisticData, item]);
      } catch (error) {
        logError("[useOptimisticUpdate]", "Failed to add item", error);
        throw error;
      }
    },
    [optimisticData, addOptimisticUpdate, onServerUpdate]
  );

  const update = useCallback(
    async (item: T): Promise<void> => {
      if (!item?.id) {
        const err = new Error("Item must have an id");
        logError("[useOptimisticUpdate]", "Invalid item for update", err);
        throw err;
      }
      addOptimisticUpdate({ action: "update", item });
      try {
        const updated = optimisticData.map((existing) =>
          existing.id === item.id ? item : existing
        );
        await onServerUpdate(updated);
      } catch (error) {
        logError("[useOptimisticUpdate]", "Failed to update item", error);
        throw error;
      }
    },
    [optimisticData, addOptimisticUpdate, onServerUpdate]
  );

  const deleteItem = useCallback(
    async (id: string | number): Promise<void> => {
      if (!id) {
        const err = new Error("Id is required");
        logError("[useOptimisticUpdate]", "Invalid id for delete", err);
        throw err;
      }
      addOptimisticUpdate({ action: "delete", item: { id } });
      try {
        const filtered = optimisticData.filter((item) => item.id !== id);
        await onServerUpdate(filtered);
      } catch (error) {
        logError("[useOptimisticUpdate]", "Failed to delete item", error);
        throw error;
      }
    },
    [optimisticData, addOptimisticUpdate, onServerUpdate]
  );

  return {
    data: optimisticData,
    add,
    update,
    delete: deleteItem,
  };
}
