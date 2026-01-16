"use client";

import { BG, BORDER, LAYOUT, POSITION, SPACING, TEXT, TRANSITION } from "@/styles/constants";
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
    <header
      className={`${POSITION.sticky} ${POSITION.top0} ${POSITION.zIndex.z10} ${LAYOUT.flexRow} shrink-0 ${SPACING.p2} ${SPACING.gap2} ${BORDER.b} ${BG.background} ${TRANSITION.all} ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12`}>
      <div className={`${LAYOUT.flexRow} ${SPACING.gap2}`}>
        <SidebarTrigger />
        <Separator orientation="vertical" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{conversationTitle || "Chat"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className={`${TEXT.xs} ml-auto ${TEXT.muted} whitespace-nowrap mr-4`}>
        {lastMessageLabel}
      </div>
    </header>
  );
});
ChatHeader.displayName = "ChatHeader";
