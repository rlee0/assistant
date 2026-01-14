import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";

interface ChatMessagesSkeletonProps {
  readonly count?: number;
}

/**
 * Skeleton loader for a single chat message
 */
const MessageSkeleton = memo(function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2 pl-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[95%]" />
      </div>
    </div>
  );
});

/**
 * Skeleton loader for multiple chat messages
 * Displays while conversation messages are being loaded
 */
export const ChatMessagesSkeleton = memo<ChatMessagesSkeletonProps>(function ChatMessagesSkeleton({
  count = 3,
}) {
  return (
    <div className="flex flex-col gap-4 px-4">
      {Array.from({ length: count }, (_, i) => (
        <MessageSkeleton key={`message-skeleton-${i}`} />
      ))}
    </div>
  );
});

/**
 * Skeleton loader for chat input area
 */
export const ChatInputSkeleton = memo(function ChatInputSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton loader for model selector
 */
export const ModelSelectorSkeleton = memo(function ModelSelectorSkeleton() {
  return (
    <>
      <Skeleton className="h-6 w-6 shrink-0 rounded" />
      <Skeleton className="h-4 flex-1 max-w-32" />
    </>
  );
});
