"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useEffect, useRef } from "react";
import { rehypePlugins, remarkPlugins } from "@/lib/markdown";

import { Shimmer } from "./shimmer";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = (): ReasoningContextValue => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("useReasoning must be used within a <Reasoning> component");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const isUncontrolled = open === undefined;
    const initialOpen = open ?? defaultOpen ?? isStreaming ?? false;

    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: initialOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: undefined,
    });

    const startTimeRef = useRef<number | null>(null);
    const wasStreamingRef = useRef(false);

    // Cleanup refs on unmount
    useEffect(() => {
      return () => {
        startTimeRef.current = null;
      };
    }, []);

    // Track duration when streaming ends
    useEffect(() => {
      if (isStreaming) {
        // Streaming started, begin timing
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now();
        }
        wasStreamingRef.current = true;
      } else if (wasStreamingRef.current && startTimeRef.current !== null) {
        // Streaming ended, calculate duration
        setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
        startTimeRef.current = null;
      }
    }, [isStreaming, setDuration]);

    // Auto-close when streaming ends (only if uncontrolled)
    useEffect(() => {
      if (!isStreaming && wasStreamingRef.current && isUncontrolled && isOpen) {
        const timer = setTimeout(() => {
          setIsOpen(false);
          wasStreamingRef.current = false;
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, isUncontrolled, setIsOpen]);

    return (
      <ReasoningContext.Provider value={{ isStreaming, isOpen, setIsOpen, duration }}>
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={setIsOpen}
          open={isOpen}
          {...props}>
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) {
    return <Shimmer duration={1}>Thinking...</Shimmer>;
  }
  if (duration === undefined) {
    return <p>Thought for a few seconds</p>;
  }
  return <p>Thought for {duration} seconds</p>;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    getThinkingMessage = defaultGetThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 cursor-pointer text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}>
        {children ?? (
          <>
            <BrainIcon className="size-4" />
            {getThinkingMessage(isStreaming, duration)}
            <ChevronDownIcon
              className={cn("size-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string;
};

export const ReasoningContent = memo(({ className, children }: ReasoningContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-4 text-sm",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}>
    <Streamdown
      className="markdown-body"
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}>
      {children}
    </Streamdown>
  </CollapsibleContent>
));

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
