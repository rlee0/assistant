"use client";

import { Code2, FileText, Globe2, Maximize2, Minimize2 } from "lucide-react";

import { Button } from "./ui/button";
import { useState } from "react";
export function CanvasPanel() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"browser" | "code" | "rich">("browser");

  return (
    <div
      className={`transition-all ${
        expanded
          ? "fixed inset-0 z-40 flex flex-col"
          : "h-64 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm"
      }`}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Globe2 className="h-4 w-4 text-zinc-600" />
          <span className="text-sm font-medium">Canvas</span>
          <div className="flex gap-1">
            {["browser", "code", "rich"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "browser" | "code" | "rich")}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  activeTab === tab
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}>
                {tab === "browser" ? "Browser" : tab === "code" ? "Code" : "Rich"}
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse" : "Expand"}>
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "browser" && (
          <div className="flex h-full items-center justify-center border-t border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            <div className="flex flex-col items-center gap-2">
              <Globe2 className="h-8 w-8" />
              <span>Interactive browser</span>
            </div>
          </div>
        )}
        {activeTab === "code" && (
          <div className="flex h-full items-center justify-center border-t border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            <div className="flex flex-col items-center gap-2">
              <Code2 className="h-8 w-8" />
              <span>Code editor</span>
            </div>
          </div>
        )}
        {activeTab === "rich" && (
          <div className="flex h-full items-center justify-center border-t border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8" />
              <span>Rich text editor</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
