"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef } from "react";
import { Plus, Pin, Trash2, Settings, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useChatStore } from "@/store/chat-store";
import Link from "next/link";

type SidebarProps = {
  onDelete?: (id: string) => void | Promise<void>;
  onNewChat?: () => void;
  onSignOut?: () => void;
};

export function Sidebar({ onDelete, onNewChat, onSignOut }: SidebarProps) {
  const { chats, order, selectedId, addChat, selectChat, togglePin } = useChatStore();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          className="w-full justify-between"
          onClick={() => {
            if (onNewChat) onNewChat();
            else addChat();
          }}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New chat
          </span>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex flex-col gap-1">
          {order.map((id) => {
            const chat = chats[id];
            if (!chat) return null;
            return (
              <DropdownMenu key={id}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={() => selectChat(id)}
                    className={clsx(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-zinc-100",
                      selectedId === id && "bg-zinc-100"
                    )}>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900">{chat.title}</span>
                        {chat.pinned ? <Pin className="h-3 w-3 rotate-45 text-amber-500" /> : null}
                      </div>
                      <TimeAgo timestamp={chat.updatedAt} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem onClick={() => togglePin(id)}>
                    {chat.pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={async () => {
                      if (onDelete) await onDelete(id);
                      else useChatStore.getState().deleteChat(id);
                    }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>
      <div className="border-t border-zinc-200 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="mr-2 h-4 w-4" />
                Account
              </span>
              <span className="text-xs text-zinc-500">Open</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-60">
            <DropdownMenuItem asChild>
              <Link href="/settings">Open settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onSignOut?.()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function TimeAgo({ timestamp }: { timestamp: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
    });
  }, [timestamp]);

  return (
    <span ref={ref} className="text-xs text-zinc-500">
      Updated just now
    </span>
  );
}
