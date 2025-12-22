"use client";

import { useState } from "react";
import { Maximize2, Minimize2, Globe2, Code2, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

export function CanvasPanel() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"browser" | "code" | "rich">(
    "browser"
  );

  return (
    <Card
      className={`transition-all ${expanded ? "fixed inset-4 z-40" : "h-64"}`}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <Globe2 className="h-4 w-4" />
          Canvas
          <span className="text-zinc-400">·</span>
          <button
            className={`rounded px-2 py-1 text-xs ${
              activeTab === "browser" ? "bg-zinc-900 text-white" : "bg-zinc-100"
            }`}
            onClick={() => setActiveTab("browser")}
          >
            Browser
          </button>
          <button
            className={`rounded px-2 py-1 text-xs ${
              activeTab === "code" ? "bg-zinc-900 text-white" : "bg-zinc-100"
            }`}
            onClick={() => setActiveTab("code")}
          >
            Code editor
          </button>
          <button
            className={`rounded px-2 py-1 text-xs ${
              activeTab === "rich" ? "bg-zinc-900 text-white" : "bg-zinc-100"
            }`}
            onClick={() => setActiveTab("rich")}
          >
            Rich text
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse canvas" : "Expand canvas"}
        >
          {expanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="h-full space-y-2">
        {activeTab === "browser" && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            <Globe2 className="mr-2 h-4 w-4" /> Interactive browser placeholder
          </div>
        )}
        {activeTab === "code" && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            <Code2 className="mr-2 h-4 w-4" /> Code editor placeholder
          </div>
        )}
        {activeTab === "rich" && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            <FileText className="mr-2 h-4 w-4" /> Rich text editor placeholder
          </div>
        )}
      </CardContent>
    </Card>
  );
}
