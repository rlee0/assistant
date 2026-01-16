"use client";

import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { BookmarkIcon, type LucideProps } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DelayedTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface CheckpointProps extends HTMLAttributes<HTMLDivElement> {
  readonly children?: ReactNode;
}

export const Checkpoint = ({ className, children, ...props }: CheckpointProps) => (
  <div className={cn("flex items-center gap-0.5 text-muted-foreground", className)} {...props}>
    {children}
    <Separator />
  </div>
);

export interface CheckpointIconProps extends LucideProps {
  readonly children?: ReactNode;
}

export function CheckpointIcon({ className, children, ...props }: CheckpointIconProps) {
  return children ?? <BookmarkIcon className={cn("size-4 shrink-0", className)} {...props} />;
}

export interface CheckpointTriggerProps extends ComponentProps<typeof Button> {
  tooltip?: string;
  messageIndex: number;
  totalMessages: number;
  onRestore?: () => void;
}

export function CheckpointTrigger({
  children,
  className,
  variant = "ghost",
  size = "sm",
  tooltip = "Restore conversation",
  messageIndex,
  totalMessages,
  onRestore,
  ...props
}: CheckpointTriggerProps) {
  const messagesToDiscard = totalMessages - messageIndex - 1;
  const discardMessage = messagesToDiscard === 1 ? "1 message" : `${messagesToDiscard} messages`;

  return (
    <AlertDialog>
      <DelayedTooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button size={size} type="button" variant={variant} className={className} {...props}>
              {children ?? <BookmarkIcon />}
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent align="start" side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </DelayedTooltip>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore to Checkpoint</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the conversation to this point and discard {discardMessage}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
// ("use client");

// import { Button } from "@/components/ui/button";
// import { Separator } from "@/components/ui/separator";
// import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// import { cn } from "@/lib/utils";
// import { BookmarkIcon, type LucideProps } from "lucide-react";
// import type { ComponentProps, HTMLAttributes } from "react";

// export type CheckpointProps = HTMLAttributes<HTMLDivElement>;

// export const Checkpoint = ({ className, children, ...props }: CheckpointProps) => (
//   <div
//     className={cn("flex items-center gap-0.5 overflow-hidden text-muted-foreground", className)}
//     {...props}>
//     {children}
//     <Separator />
//   </div>
// );

// export type CheckpointIconProps = LucideProps;

// export const CheckpointIcon = ({ className, children, ...props }: CheckpointIconProps) =>
//   children ?? <BookmarkIcon className={cn("size-4 shrink-0", className)} {...props} />;

// export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
//   tooltip?: string;
// };

// export const CheckpointTrigger = ({
//   children,
//   className,
//   variant = "ghost",
//   size = "sm",
//   tooltip,
//   ...props
// }: CheckpointTriggerProps) =>
//   tooltip ? (
//     <Tooltip>
//       <TooltipTrigger asChild>
//         <Button size={size} type="button" variant={variant} {...props}>
//           {children}
//         </Button>
//       </TooltipTrigger>
//       <TooltipContent align="start" side="bottom">
//         {tooltip}
//       </TooltipContent>
//     </Tooltip>
//   ) : (
//     <Button size={size} type="button" variant={variant} {...props}>
//       {children}
//     </Button>
//   );
