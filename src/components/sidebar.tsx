"use client";

import { formatDistanceToNow } from "date-fns";
import { Plus, Pin, Trash2, Settings } from "lucide-react";
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

export function Sidebar() {
  const {
    chats,
    order,
    selectedId,
    addChat,
    selectChat,
    deleteChat,
    togglePin,
  } = useChatStore();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Button className="w-full justify-between" onClick={() => addChat()}>
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
                    )}
                  >
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900">
                          {chat.title}
                        </span>
                        {chat.pinned ? (
                          <Pin className="h-3 w-3 rotate-45 text-amber-500" />
                        ) : null}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(chat.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
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
                    onClick={() => deleteChat(id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>
      <div className="border-t border-zinc-200 p-3">
        <Link href="/settings" className="flex items-center gap-2">
          <Button variant="outline" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Account & Settings
          </Button>
        </Link>
      </div>
    </aside>
  );
}
