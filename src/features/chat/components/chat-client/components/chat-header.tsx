"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import type { ChatHeaderProps } from "../types";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { memo } from "react";

/**
 * Chat header with breadcrumb navigation
 */
export const ChatHeader = memo<ChatHeaderProps>(({ conversationTitle, lastMessageLabel }) => {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center p-4 gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{conversationTitle || "Chat"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="text-xs ml-auto text-muted-foreground whitespace-nowrap">
        {lastMessageLabel}
      </div>
    </header>
  );
});
ChatHeader.displayName = "ChatHeader";
