import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";

interface SidebarConversationsSkeletonProps {
  readonly count?: number;
}

/**
 * Skeleton loader for sidebar conversations list
 * Displays while conversations are being loaded from the server
 */
export const SidebarConversationsSkeleton = memo<SidebarConversationsSkeletonProps>(
  function SidebarConversationsSkeleton({ count = 5 }) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Conversations</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {Array.from({ length: count }, (_, i) => (
              <SidebarMenuItem key={`conversation-skeleton-${i}`}>
                <SidebarMenuButton disabled>
                  <Skeleton className="h-4 w-full" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }
);

/**
 * Skeleton loader for user profile section
 * Displays in sidebar footer while user data is being loaded
 */
export const UserProfileSkeleton = memo(function UserProfileSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-4" />
    </div>
  );
});
