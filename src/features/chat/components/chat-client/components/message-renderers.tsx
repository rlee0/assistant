"use client";

import { CSS_CLASSES, MESSAGE_PART_TYPE } from "@/features/chat/constants";
import type { MessagePartRendererProps, SourcesRendererProps } from "../types";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai/sources";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai/tool";
import { getToolName, isToolUIPart } from "ai";

import Image from "next/image";
import { MessageResponse } from "@/components/ai/message";
import { memo } from "react";

/**
 * Renders a message part based on its type with exhaustive type checking
 */
export const MessagePartRenderer = memo(function MessagePartRenderer({
  part,
  index,
  isStreaming = false,
}: MessagePartRendererProps) {
  const partAsRecord = part as Record<string, unknown>;

  // Debug logging - Enhanced to track reasoning parts
  if (typeof window !== "undefined") {
    console.log("[MessagePartRenderer]", {
      index,
      type: partAsRecord.type,
      isStreaming,
      hasText: !!partAsRecord.text,
      textLength: typeof partAsRecord.text === 'string' ? partAsRecord.text.length : 0,
      allKeys: Object.keys(partAsRecord),
      isReasoning: partAsRecord.type === MESSAGE_PART_TYPE.REASONING,
    });
  }

  // Text content
  if (partAsRecord.type === MESSAGE_PART_TYPE.TEXT) {
    return <MessageResponse key={index}>{String(partAsRecord.text || "")}</MessageResponse>;
  }

  // Reasoning/thinking content
  if (partAsRecord.type === MESSAGE_PART_TYPE.REASONING) {
    console.log("[MessagePartRenderer] 🧠 Rendering reasoning part", { 
      isStreaming,
      hasText: !!partAsRecord.text,
      textLength: typeof partAsRecord.text === 'string' ? partAsRecord.text.length : 0,
      textPreview: typeof partAsRecord.text === 'string' ? partAsRecord.text.slice(0, 100) : null,
      partKeys: Object.keys(partAsRecord),
    });
    return (
      <Reasoning key={index} defaultOpen={true} isStreaming={isStreaming}>
        <ReasoningTrigger />
        <ReasoningContent>{String(partAsRecord.text || "")}</ReasoningContent>
      </Reasoning>
    );
  }

  // Tool calls with proper type checking using AI SDK type guards
  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    // Keep tools collapsed by default for cleaner conversation view
    const shouldDefaultOpen = false;

    return (
      <Tool key={index} defaultOpen={shouldDefaultOpen}>
        <ToolHeader
          type={String(partAsRecord.type || "")}
          state={
            partAsRecord.state as
              | "input-streaming"
              | "input-available"
              | "approval-requested"
              | "approval-responded"
              | "output-available"
              | "output-error"
              | "output-denied"
              | undefined
          }
          title={toolName}
        />
        <ToolContent>
          <ToolInput input={partAsRecord.input} />
          <ToolOutput
            output={partAsRecord.output}
            errorText={String(partAsRecord.errorText || "")}
          />
        </ToolContent>
      </Tool>
    );
  }

  // Image files with runtime validation
  if (
    partAsRecord.type === MESSAGE_PART_TYPE.FILE &&
    String(partAsRecord.mediaType || "").startsWith("image/")
  ) {
    const url = String(partAsRecord.url || "");
    const filename = String(partAsRecord.filename || "Uploaded image");
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

  // Source URLs are handled by SourcesRenderer, not individually
  // Unsupported or unknown part types
  return null;
});
MessagePartRenderer.displayName = "MessagePartRenderer";

/**
 * Groups and renders source-url parts using the Sources component
 */
export const SourcesRenderer = memo(function SourcesRenderer({ parts }: SourcesRendererProps) {
  const sources = parts.filter((part) => {
    const partAsRecord = part as Record<string, unknown>;
    return partAsRecord.type === MESSAGE_PART_TYPE.SOURCE_URL;
  });

  if (sources.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((source, index) => {
          const sourceAsRecord = source as Record<string, unknown>;
          const url = String(sourceAsRecord.url || "");
          const title = String(sourceAsRecord.title || url);
          return <Source key={index} href={url} title={title} />;
        })}
      </SourcesContent>
    </Sources>
  );
});
SourcesRenderer.displayName = "SourcesRenderer";
