"use client";

import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";

export function ChatClient() {
  return (
    <SidebarProvider>
      <Sidebar />
    </SidebarProvider>
  );
}
