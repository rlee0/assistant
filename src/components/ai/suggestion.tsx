"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({ className, children, ...props }: SuggestionsProps) => (
  <ScrollArea className="w-full overflow-x-auto whitespace-nowrap" {...props}>
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>{children}</div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };

  return (
    <Button
      aria-label={`Apply suggestion: ${suggestion}`}
      className={cn("cursor-pointer rounded-full px-4", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}>
      {children || suggestion}
    </Button>
  );
};

export const SuggestionsSkeleton = ({ className }: { className?: string }) => (
  <ScrollArea className="w-full overflow-x-auto whitespace-nowrap">
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>
      <Skeleton className="h-8 w-32 rounded-full" />
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="h-8 w-36 rounded-full" />
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);
