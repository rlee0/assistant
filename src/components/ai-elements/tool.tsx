"use client";

import * as React from "react";

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ai-elements/code-block";
import type { ToolUIPart } from "ai";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ToolState = ToolUIPart["state"];

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<
  ToolState,
  { label: string; icon: React.ReactNode; ariaLabel: string }
> = {
  "input-streaming": {
    label: "Pending",
    icon: <CircleIcon className="size-4" />,
    ariaLabel: "Tool execution pending",
  },
  "input-available": {
    label: "Running",
    icon: <ClockIcon className="size-4 animate-pulse" />,
    ariaLabel: "Tool is running",
  },
  "approval-requested": {
    label: "Awaiting Approval",
    icon: <ClockIcon className="size-4 text-yellow-600" />,
    ariaLabel: "Tool awaiting approval",
  },
  "approval-responded": {
    label: "Responded",
    icon: <CheckCircleIcon className="size-4 text-blue-600" />,
    ariaLabel: "Approval responded",
  },
  "output-available": {
    label: "Completed",
    icon: <CheckCircleIcon className="size-4 text-green-600" />,
    ariaLabel: "Tool execution completed",
  },
  "output-error": {
    label: "Error",
    icon: <XCircleIcon className="size-4 text-red-600" />,
    ariaLabel: "Tool execution failed",
  },
  "output-denied": {
    label: "Denied",
    icon: <XCircleIcon className="size-4 text-orange-600" />,
    ariaLabel: "Tool execution denied",
  },
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Safely serializes a value to JSON string
 * Handles circular references and non-serializable values
 */
function safeJsonStringify(value: unknown, indent: number = 2): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch (error) {
    // Handle circular references or non-serializable values
    if (error instanceof TypeError && error.message.includes("circular")) {
      return "[Circular Reference Detected]";
    }
    return String(value);
  }
}

// ============================================================================
// Tool
// ============================================================================

interface ToolProps extends React.ComponentPropsWithoutRef<typeof Collapsible> {
  defaultOpen?: boolean;
}

const Tool = React.forwardRef<React.ElementRef<typeof Collapsible>, ToolProps>(
  ({ className, defaultOpen = false, ...props }, ref) => (
    <Collapsible
      ref={ref}
      defaultOpen={defaultOpen}
      className={cn("not-prose mb-4 w-full rounded-md border", className)}
      {...props}
    />
  )
);
Tool.displayName = "Tool";

// ============================================================================
// ToolHeader
// ============================================================================

interface ToolHeaderProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CollapsibleTrigger>, "type"> {
  title?: string;
  type?: string;
  state?: ToolState;
}

const ToolHeader = React.forwardRef<React.ElementRef<typeof CollapsibleTrigger>, ToolHeaderProps>(
  ({ className, title, type, state, ...props }, ref) => {
    // Parse tool name from type (e.g., "tool-database_query" -> "database_query")
    const displayTitle = title ?? (type ? type.split("-").slice(1).join("_") : "tool");
    const statusConfig = state ? STATUS_CONFIG[state] : null;

    return (
      <CollapsibleTrigger
        ref={ref}
        className={cn("flex w-full items-center justify-between gap-4 p-3 group", className)}
        {...props}>
        <div className="flex items-center gap-2">
          <WrenchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium text-sm">{displayTitle}</span>
          {statusConfig && (
            <Badge
              className="gap-1.5 rounded-full text-xs"
              variant="secondary"
              aria-label={statusConfig.ariaLabel}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          )}
        </div>
        <ChevronDownIcon
          className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
    );
  }
);
ToolHeader.displayName = "ToolHeader";

// ============================================================================
// ToolContent
// ============================================================================

const ToolContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsibleContent
    ref={ref}
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
));
ToolContent.displayName = "ToolContent";

// ============================================================================
// ToolInput
// ============================================================================

interface ToolInputProps extends React.HTMLAttributes<HTMLDivElement> {
  input?: unknown;
}

const ToolInput = React.forwardRef<HTMLDivElement, ToolInputProps>(
  ({ className, input, ...props }, ref) => {
    if (!input) return null;

    const inputString = safeJsonStringify(input, 2);

    return (
      <div ref={ref} className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Parameters
        </h4>
        <div className="rounded-md bg-muted/50">
          <CodeBlock code={inputString} language="json" />
        </div>
      </div>
    );
  }
);
ToolInput.displayName = "ToolInput";

// ============================================================================
// ToolOutput
// ============================================================================

interface ToolOutputProps extends React.HTMLAttributes<HTMLDivElement> {
  output?: unknown;
  errorText?: string;
}

const ToolOutput = React.forwardRef<HTMLDivElement, ToolOutputProps>(
  ({ className, output, errorText, ...props }, ref) => {
    if (!(output !== undefined || errorText)) {
      return null;
    }

    let OutputElement: React.ReactNode = null;

    if (errorText) {
      // Error state: display error text
      OutputElement = <div className="p-3">{errorText}</div>;
    } else if (output !== undefined) {
      // Success state: handle different output types
      if (React.isValidElement(output)) {
        // React element: render directly
        OutputElement = output;
      } else if (typeof output === "string") {
        // String: display as markdown or plain text
        OutputElement = <div className="p-3 whitespace-pre-wrap font-mono">{output}</div>;
      } else if (typeof output === "object" && output !== null) {
        // Object: serialize to JSON
        const outputString = safeJsonStringify(output, 2);
        OutputElement = <CodeBlock code={outputString} language="json" />;
      } else {
        // Primitives (number, boolean, null): display as string
        OutputElement = <div className="p-3">{String(output)}</div>;
      }
    }

    return (
      <div ref={ref} className={cn("space-y-2 p-4", className)} {...props}>
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {errorText ? "Error" : "Result"}
        </h4>
        <div
          className={cn(
            "overflow-x-auto rounded-md text-xs [&_table]:w-full",
            errorText ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-foreground"
          )}>
          {OutputElement}
        </div>
      </div>
    );
  }
);
ToolOutput.displayName = "ToolOutput";

// ============================================================================
// Exports
// ============================================================================

export { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput };
export type { ToolProps, ToolHeaderProps, ToolInputProps, ToolOutputProps };
