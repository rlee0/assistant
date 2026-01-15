"use client";

import { Copy, Edit, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { memo, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { NavUser } from "@/features/auth/components/nav-user";
import { SidebarConversationsSkeleton } from "@/components/skeletons/sidebar-skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useManualProgress } from "@/hooks/use-navigation-progress";
import { useRouter } from "next/navigation";

/**
 * Conversation status types
 */
type ConversationStatus = "idle" | "loading" | "streaming" | "error";

/**
 * Conversation data structure
 */
interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
}

/**
 * User profile data
 */
interface UserProfile {
  readonly name: string;
  readonly email: string;
  readonly avatar?: string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  readonly user: UserProfile;
  readonly conversations: Readonly<Record<string, Conversation>>;
  readonly conversationOrder: ReadonlyArray<string>;
  readonly selectedId: string | null;
  readonly conversationStatuses: Readonly<Record<string, ConversationStatus>>;
  readonly deleting: Readonly<Record<string, boolean>>;
  readonly creatingChat: boolean;
  readonly hydrated: boolean;
  readonly onNewChat: () => Promise<boolean>;
  readonly onSelectConversation: (id: string) => void;
  readonly onDeleteConversation: (id: string) => void;
  readonly onCopyConversation: (id: string) => Promise<void>;
}

/**
 * Conversation status indicator component
 */
const ConversationStatusIndicator = memo<{ status: ConversationStatus }>(
  function ConversationStatusIndicator({ status }) {
    if (status !== "streaming" && status !== "loading") return null;

    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }
);

/**
 * Main application sidebar component
 * Displays conversation list, new chat button, and user menu
 */
export const AppSidebar = memo<AppSidebarProps>(function AppSidebar({
  user,
  conversations,
  conversationOrder,
  selectedId,
  conversationStatuses,
  deleting,
  creatingChat,
  hydrated,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onCopyConversation,
  ...props
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { startProgress, completeProgress } = useManualProgress();

  const handleNewChat = useCallback(async () => {
    startProgress();
    try {
      const didNavigate = await onNewChat();
      // If no navigation occurred, complete the progress bar manually
      // Navigation auto-completes via ProgressBarProvider pathname change
      if (!didNavigate) {
        completeProgress();
      }
    } catch (error) {
      // Ensure progress bar completes even on error
      completeProgress();
      throw error;
    }
  }, [onNewChat, startProgress, completeProgress]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      startProgress();
      router.push(`/chat/${id}`);
      onSelectConversation(id);
    },
    [router, onSelectConversation, startProgress]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      startProgress();
      onDeleteConversation(id);
    },
    [onDeleteConversation, startProgress]
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleNewChat}
            className="w-full justify-start"
            disabled={creatingChat}>
            {creatingChat ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Edit className="size-4" />
            )}
            <span>New chat</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {!hydrated ? (
          <SidebarConversationsSkeleton />
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
              {conversationOrder.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4">No conversations yet.</p>
              ) : (
                <SidebarMenu>
                  {conversationOrder.map((id) => {
                    const conversation = conversations[id];
                    if (!conversation) return null;
                    const status = conversationStatuses[id] ?? "idle";
                    const title = conversation.title || "Untitled chat";
                    const isActive = id === selectedId;
                    const isDeleting = deleting[id] ?? false;

                    return (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleSelectConversation(id)}
                          tooltip={title}>
                          <span className="flex-1 truncate">{title}</span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {status === "loading" || status === "streaming" ? (
                              <SidebarMenuAction disabled aria-label={`${title} is ${status}`}>
                                <ConversationStatusIndicator status={status} />
                              </SidebarMenuAction>
                            ) : (
                              <SidebarMenuAction
                                showOnHover
                                disabled={isDeleting}
                                aria-label={`Options for ${title}`}>
                                {isDeleting ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="size-4" />
                                )}
                              </SidebarMenuAction>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48"
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}>
                            <DropdownMenuItem
                              onClick={async (event) => {
                                event.stopPropagation();
                                await onCopyConversation(id);
                              }}
                              disabled={isDeleting}>
                              <Copy className="size-4" />
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteConversation(id);
                              }}
                              disabled={isDeleting}>
                              {isDeleting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});
