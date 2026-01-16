import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { LAYOUT, SPACING, SIZE, BG, BORDER } from "@/styles/constants";

interface MessageSkeletonProps {
  readonly variant?: "user" | "assistant";
  readonly count?: number;
}

export const MessageSkeleton = memo<MessageSkeletonProps>(function MessageSkeleton({
  variant = "assistant",
  count = 1,
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`message-skeleton-${i}`}
          className={cn(
            `${LAYOUT.flexRow} ${SPACING.gap3} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`,
            variant === "user" ? "flex-row-reverse" : "flex-row"
          )}>
          <Skeleton className={`h-8 w-8 ${BORDER.rounded.full} shrink-0`} />

          <div className="flex-1 space-y-2 max-w-xs">
            <Skeleton className="h-4 w-24" />
            <Skeleton className={`h-4 ${SIZE.wFull}`} />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </>
  );
});

interface MessageLoadingIndicatorProps {
  readonly variant?: "user" | "assistant";
}

export const MessageLoadingIndicator = memo<MessageLoadingIndicatorProps>(
  function MessageLoadingIndicator({ variant = "assistant" }) {
    return (
      <div
        className={cn(
          `${LAYOUT.flexRow} ${SPACING.gap3} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`,
          variant === "user" ? "flex-row-reverse" : "flex-row"
        )}>
        <Skeleton className={`h-8 w-8 ${BORDER.rounded.full} shrink-0`} />

        <div
          className={`${LAYOUT.flexRow} ${SPACING.gap1} ${SPACING.p2} ${BG.accent} ${BORDER.rounded.lg}`}>
          <div className={`h-2 w-2 ${BORDER.rounded.full} bg-muted-foreground animate-bounce`} />
          <div
            className={`h-2 w-2 ${BORDER.rounded.full} bg-muted-foreground animate-bounce [animation-delay:0.1s]`}
          />
          <div
            className={`h-2 w-2 ${BORDER.rounded.full} bg-muted-foreground animate-bounce [animation-delay:0.2s]`}
          />
        </div>
      </div>
    );
  }
);
