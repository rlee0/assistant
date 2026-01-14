"use client";

import { Edit, Loader2, Trash2 } from "lucide-react";
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
import { NavUser } from "@/components/nav-user";
import { SidebarConversationsSkeleton } from "@/components/skeletons/sidebar-skeleton";
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
  readonly onNewChat: () => void;
  readonly onSelectConversation: (id: string) => void;
  readonly onDeleteConversation: (id: string) => void;
  readonly onSettingsClick: () => void;
}

/**
 * Conversation status indicator component
 */
const ConversationStatusIndicator = memo<{ status: ConversationStatus }>(
  function ConversationStatusIndicator({ status }) {
    if (status !== "streaming") return null;

    return <Loader2 className="size-3 animate-spin text-muted-foreground" />;
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
  onSettingsClick,
  ...props
}) {
  const router = useRouter();

  const handleNewChat = useCallback(() => {
    onNewChat();
  }, [onNewChat]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
      onSelectConversation(id);
    },
    [router, onSelectConversation]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      onDeleteConversation(id);
    },
    [onDeleteConversation]
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
                          <ConversationStatusIndicator status={status} />
                        </SidebarMenuButton>
                        <SidebarMenuAction
                          type="button"
                          aria-label={`Delete ${title}`}
                          showOnHover
                          disabled={isDeleting}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteConversation(id);
                          }}>
                          {isDeleting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </SidebarMenuAction>
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
        <NavUser user={user} onSettingsClick={onSettingsClick} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});
