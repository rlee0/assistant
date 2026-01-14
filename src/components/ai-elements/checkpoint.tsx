"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DelayedTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { BookmarkIcon, type LucideProps } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";

export type CheckpointProps = HTMLAttributes<HTMLDivElement> & {
  messageIndex: number;
  totalMessages: number;
  onRestore?: () => void;
};

export const Checkpoint = ({
  className,
  children,
  messageIndex,
  totalMessages,
  onRestore,
  ...props
}: CheckpointProps) => (
  <div
    className={cn(
      "group flex items-center gap-0.5 text-muted-foreground overflow-hidden opacity-0 hover:opacity-100 transition-opacity",
      className
    )}
    {...props}>
    {children}
    <Separator className="flex-1" />
  </div>
);

export type CheckpointIconProps = LucideProps;

export const CheckpointIcon = ({ className, children, ...props }: CheckpointIconProps) =>
  children ?? <BookmarkIcon className={cn("size-4 shrink-0", className)} {...props} />;

export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  messageIndex: number;
  totalMessages: number;
  onRestore?: () => void;
};

export const CheckpointTrigger = ({
  children,
  className,
  variant = "ghost",
  size = "sm",
  tooltip,
  messageIndex,
  totalMessages,
  onRestore,
  ...props
}: CheckpointTriggerProps) => {
  const messagesToDiscard = totalMessages - messageIndex - 1;

  return (
    <AlertDialog>
      <DelayedTooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button size={size} type="button" variant={variant} className="h-6" {...props}>
              {children ?? "Restore Checkpoint"}
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent align="start" side="bottom" className="text-xs">
          {tooltip ?? "Restore conversation"}
        </TooltipContent>
      </DelayedTooltip>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore to Checkpoint</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the conversation to this point and discard{" "}
            {messagesToDiscard === 1 ? "1 message" : `${messagesToDiscard} messages`}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
