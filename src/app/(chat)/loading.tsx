"use client";

import { BG, BORDER, LAYOUT, POSITION, SPACING, TEXT, TRANSITION } from "@/styles/constants";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  SidebarConversationsSkeleton,
  UserProfileSkeleton,
} from "@/components/skeletons/sidebar-skeleton";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton that exactly matches the ChatClient layout with perfect heights and widths
 */
export default function Loading() {
  return (
    <SidebarProvider>
      {/* Sidebar - matches AppSidebar */}
      <Sidebar collapsible="offcanvas">
        {/* Header with New Chat button */}
        <SidebarHeader>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </SidebarHeader>
        <SidebarSeparator />

        {/* Conversations list - shows loading state */}
        <SidebarContent>
          <SidebarConversationsSkeleton count={8} />
        </SidebarContent>

        {/* Footer with user profile */}
        <SidebarFooter>
          <UserProfileSkeleton />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Main content area - matches SidebarInset structure */}
      <SidebarInset>
        {/* ChatHeader - sticky at top with breadcrumb and last message timestamp */}
        <header
          className={`${POSITION.sticky} ${POSITION.top0} ${POSITION.zIndex.z10} ${LAYOUT.flexRow} shrink-0 ${SPACING.p2} ${SPACING.gap2} ${BORDER.b} ${BG.background} ${TRANSITION.all} ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12`}>
          <div className={`${LAYOUT.flexRow} ${SPACING.gap2}`}>
            <SidebarTrigger />
            <Separator orientation="vertical" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    <Skeleton className="h-5 w-32" />
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className={`${TEXT.xs} ml-auto ${TEXT.muted} whitespace-nowrap mr-4`}>
            <Skeleton className="h-4 w-20" />
          </div>
        </header>

        {/* Main flex container - flex-1 flex-col min-h-0 */}
        <div className="flex flex-1 flex-col min-h-0">
          {/* ChatMessages container - matches CSS_CLASSES.messagesContainer */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            {/* Empty state skeleton - matches Empty component structure with centered content */}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-6 md:p-12">
              {/* EmptyHeader with title and description */}
              <div className="flex max-w-sm flex-col items-center gap-2 text-center">
                <div className="text-lg font-medium tracking-tight">
                  <Skeleton className="h-7 w-48" />
                </div>
                <p className="text-muted-foreground text-sm/relaxed">
                  <Skeleton className="h-4 w-56" />
                </p>
              </div>
            </div>
          </div>

          {/* ChatInput - sticky at bottom with inputContainer styling */}
          <div
            className={`${POSITION.sticky} ${POSITION.bottom0} ${POSITION.zIndex.z20} ${BG.background} ${SPACING.px4} pb-4`}>
            <div className="mx-auto max-w-3xl">
              <div className="space-y-3">
                {/* Textarea skeleton */}
                <Skeleton className="h-12 w-full rounded-lg" />

                {/* Controls skeleton */}
                <div className="flex justify-between items-center gap-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                  <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              </div>

              {/* Disclaimer text skeleton */}
              <div className="text-center text-xs text-muted-foreground p-2 mt-2">
                <Skeleton className="h-3 w-64 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
