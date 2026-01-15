import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface ChatInputSkeletonProps {
  readonly className?: string;
}

export const ChatInputSkeleton = memo<ChatInputSkeletonProps>(function ChatInputSkeleton({
  className,
}) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {/* Textarea skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Controls skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  );
});

interface ConversationAreaSkeletonProps {
  readonly messageCount?: number;
  readonly className?: string;
}

export const ConversationAreaSkeleton = memo<ConversationAreaSkeletonProps>(
  function ConversationAreaSkeleton({ messageCount = 5, className }) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Array.from({ length: messageCount }, (_, i) => (
            <div
              key={`message-group-${i}`}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
              style={{
                animationDelay: `${i * 100}ms`,
              }}>
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <ChatInputSkeleton />
      </div>
    );
  }
);

interface PageLoadingSkeletonProps {
  readonly showSidebar?: boolean;
  readonly className?: string;
}

export const PageLoadingSkeleton = memo<PageLoadingSkeletonProps>(function PageLoadingSkeleton({
  showSidebar = true,
  className,
}) {
  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", className)}>
      {/* Sidebar skeleton */}
      {showSidebar && (
        <div className="hidden md:flex w-64 border-r bg-sidebar flex-col p-4 gap-4">
          {/* Header skeleton */}
          <Skeleton className="h-10 w-full rounded-lg" />

          {/* Conversations list skeleton */}
          <div className="space-y-2 flex-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={`sidebar-item-${i}`} className="flex gap-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              </div>
            ))}
          </div>

          {/* Footer skeleton */}
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      )}

      {/* Main content area */}
      <ConversationAreaSkeleton messageCount={4} className="flex-1" />
    </div>
  );
});
