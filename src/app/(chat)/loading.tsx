import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar skeleton */}
        <div className="hidden w-64 flex-col border-r bg-background md:flex">
          <div className="border-b p-4">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Main chat area skeleton */}
        <SidebarInset className="flex flex-col">
          {/* Header */}
          <div className="border-b bg-background px-6 py-4">
            <Skeleton className="h-9 w-48" />
          </div>

          {/* Messages area */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex gap-3 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
                <div className="flex flex-col gap-2 max-w-xs">
                  <Skeleton className="h-12 w-64 rounded-lg" />
                  <Skeleton className="h-10 w-52 rounded-lg" />
                </div>
                {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
              </div>
            ))}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
