import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";

/**
 * Skeleton loader for model selector
 */
export const ModelSelectorSkeleton = memo(function ModelSelectorSkeleton() {
  return (
    <>
      <Skeleton className="h-6 w-6 shrink-0 rounded" />
      <Skeleton className="h-5 w-32" />
    </>
  );
});
