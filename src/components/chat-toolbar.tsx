"use client";

import { format } from "date-fns";
import { EllipsisVertical, Pin, Trash2, PanelLeft } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "./breadcrumbs";
import { Button } from "./ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useChatStore } from "@/store/chat-store";

export function ChatToolbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);
  const { selectedId, chats, togglePin, deleteChat } = useChatStore();
  const chat = selectedId ? chats[selectedId] : undefined;
  if (!chat) return null;

  return (
    <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
      <div className="flex items-center gap-3">
        {onToggleSidebar ? (
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <PanelLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="flex flex-col gap-1">
          <Breadcrumbs
            segments={[
              { label: "Chats", href: "/" },
              { label: chat.title, active: true },
            ]}
          />
          <div className="text-sm text-zinc-500">
            Updated <UpdatedTimestamp timestamp={chat.updatedAt} />
          </div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <EllipsisVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => togglePin(chat.id)}>
            <Pin className="mr-2 h-4 w-4" />
            {chat.pinned ? "Unpin chat" : "Pin chat"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => deleteChat(chat.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete chat
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              if (!supabase) {
                console.warn("Supabase not configured; cannot sign out.");
                return;
              }
              await supabase.auth.signOut();
              router.replace("/login");
            }}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function UpdatedTimestamp({ timestamp }: { timestamp: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = format(new Date(timestamp), "PP p");
  }, [timestamp]);

  return <span ref={ref}>just now</span>;
}
