import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { memo } from "react";

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
            "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
            variant === "user" ? "flex-row-reverse" : "flex-row"
          )}>
          {/* Avatar skeleton */}
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />

          {/* Message content skeleton */}
          <div className="flex-1 space-y-2 max-w-xs">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
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
          "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
          variant === "user" ? "flex-row-reverse" : "flex-row"
        )}>
        {/* Avatar */}
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />

        {/* Typing indicator */}
        <div className="flex items-center gap-1 p-2 bg-accent rounded-lg">
          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    );
  }
);
