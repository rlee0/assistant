"use client";

import type { MessagePartRendererProps, SourcesRendererProps } from "../types";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai/sources";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai/tool";
import { getToolName, isToolUIPart } from "ai";
import { isFilePart, isImagePart, isReasoningPart, isTextPart } from "../utils/message-parts";

import { CSS_CLASSES } from "@/features/chat/constants";
import Image from "next/image";
import { MessageResponse } from "@/components/ai/message";
import { memo } from "react";

/**
 * Type guard to safely extract a property from a tool part
 */
function getToolProperty<T>(part: unknown, key: string, defaultValue: T): T {
  if (typeof part === "object" && part !== null && key in part) {
    const value = (part as Record<string, unknown>)[key];
    return (value !== undefined ? value : defaultValue) as T;
  }
  return defaultValue;
}

/**
 * Renders a message part based on its type with exhaustive type checking
 *
 * Uses type guards for type-safe rendering without unsafe casts.
 */
export const MessagePartRenderer = memo(function MessagePartRenderer({
  part,
  index,
  isStreaming = false,
}: MessagePartRendererProps) {
  // Text content
  if (isTextPart(part)) {
    return <MessageResponse key={index}>{part.text}</MessageResponse>;
  }

  // Reasoning/thinking content
  if (isReasoningPart(part)) {
    return (
      <Reasoning key={index} defaultOpen={isStreaming} isStreaming={isStreaming}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text ?? ""}</ReasoningContent>
      </Reasoning>
    );
  }

  // Tool calls with proper type checking using AI SDK type guards
  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    const shouldDefaultOpen = false;
    const toolType = getToolProperty<string>(part, "type", "tool");
    const toolState = getToolProperty<
      | "input-streaming"
      | "input-available"
      | "approval-requested"
      | "approval-responded"
      | "output-available"
      | "output-error"
      | "output-denied"
      | undefined
    >(part, "state", undefined);
    const toolInput = getToolProperty<unknown>(part, "input", undefined);
    const toolOutput = getToolProperty<unknown>(part, "output", undefined);
    const toolError = getToolProperty<string>(part, "errorText", "");

    return (
      <Tool key={index} defaultOpen={shouldDefaultOpen}>
        <ToolHeader type={toolType} state={toolState} title={toolName} />
        <ToolContent>
          <ToolInput input={toolInput} />
          <ToolOutput output={toolOutput} errorText={toolError} />
        </ToolContent>
      </Tool>
    );
  }

  // Image files with runtime validation
  if (isImagePart(part)) {
    const imagePart = part as { type: "image"; image?: string; mimeType?: string };
    const url = imagePart.image || "";
    const filename = "Uploaded image";
    return (
      <Image
        key={index}
        src={url}
        alt={filename}
        width={384}
        height={384}
        className={CSS_CLASSES.image}
        unoptimized={url.startsWith("data:")}
      />
    );
  }

  // File attachments (non-image)
  if (isFilePart(part)) {
    const filePart = part as { type: "file"; url?: string; mediaType?: string; filename?: string };
    
    // Check if it's an image media type - render as image
    if (filePart.mediaType?.startsWith("image/") && filePart.url) {
      return (
        <Image
          key={index}
          src={filePart.url}
          alt={filePart.filename || "Uploaded image"}
          width={384}
          height={384}
          className={CSS_CLASSES.image}
          unoptimized={filePart.url.startsWith("data:")}
        />
      );
    }
    
    // For non-image files, display file info
    return (
      <div key={index} className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
        <div className="flex size-8 items-center justify-center rounded bg-background">
          <svg
            className="size-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">
            {filePart.filename || "Attached file"}
          </div>
          {filePart.mediaType && (
            <div className="truncate font-mono text-muted-foreground text-xs">
              {filePart.mediaType}
            </div>
          )}
        </div>
        {filePart.url && (
          <a
            href={filePart.url}
            download={filePart.filename}
            className="text-primary hover:underline text-sm"
            target="_blank"
            rel="noopener noreferrer">
            Download
          </a>
        )}
      </div>
    );
  }

  // Source URLs are handled by SourcesRenderer, not individually
  // Unsupported or unknown part types
  return null;
});
MessagePartRenderer.displayName = "MessagePartRenderer";

/**
 * Groups and renders source-url parts using the Sources component
 *
 * Filters parts safely using type guards and renders URLs properly.
 */
export const SourcesRenderer = memo(function SourcesRenderer({ parts }: SourcesRendererProps) {
  const sources = parts.filter(
    (part): part is { type: "source-url"; url: string; title?: string } => {
      if (typeof part !== "object" || part === null || !("type" in part)) return false;
      const p = part as Record<string, unknown>;
      return p.type === "source-url" && typeof p.url === "string";
    }
  );

  if (sources.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((source, index) => (
          <Source key={index} href={source.url} title={source.title || source.url} />
        ))}
      </SourcesContent>
    </Sources>
  );
});
SourcesRenderer.displayName = "SourcesRenderer";
