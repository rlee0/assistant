"use client";

import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { ChevronLeftIcon, ChevronRightIcon, PaperclipIcon, XIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";
import { DelayedTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FileUIPart, UIMessage } from "ai";
import { createContext, memo, useContext, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import NextImage from "next/image";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import {
  LAYOUT,
  SPACING,
  SIZE,
  TEXT,
  BORDER,
  BG,
  POSITION,
  OVERFLOW,
  TRANSITION,
  INTERACTIVE,
  DISPLAY,
  ALIGN,
} from "@/styles/constants";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      `group ${LAYOUT.flexCol} ${SIZE.wFull} ${SIZE.maxW["95%"]} ${SPACING.gap2}`,
      from === "user"
        ? "is-user ml-auto justify-end"
        : from === "system"
          ? `is-system ${SIZE.wFull} justify-center`
          : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      `is-user:dark ${LAYOUT.flexCol} w-fit max-w-full ${SIZE.minW0} ${SPACING.gap2} *:data-[slot=input-group]:overflow-visible ${TEXT.sm}`,
      `group-[.is-user]:ml-auto group-[.is-user]:${BORDER.rounded.lg} group-[.is-user]:${BG.secondary} group-[.is-user]:${SPACING.px4} group-[.is-user]:${SPACING.py3} group-[.is-user]:${TEXT.foreground}`,
      `group-[.is-assistant]:${TEXT.foreground}`,
      `group-[.is-system]:${SIZE.wFull} group-[.is-system]:${SPACING.px3} group-[.is-system]:${SPACING.py2} group-[.is-system]:${BORDER.rounded.md} group-[.is-system]:${BG.transparent} group-[.is-system]:${TEXT.muted} group-[.is-system]:${TEXT.xs} group-[.is-system]:${TEXT.italic}`,
      className
    )}
    {...props}>
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({ className, children, ...props }: MessageActionsProps) => (
  <div
    className={cn(
      `${LAYOUT.flexRow} ${SPACING.gap1} opacity-0 ${TRANSITION.opacity} group-hover:opacity-100`,
      className
    )}
    {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  className,
  ...props
}: MessageActionProps) => {
  const button = (
    <Button
      size={size}
      type="button"
      variant={variant}
      className={cn(INTERACTIVE.cursor.pointer, className)}
      {...props}>
      {children}
      <span className={DISPLAY.srOnly}>{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <DelayedTooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </DelayedTooltip>
    );
  }

  return button;
};

type MessageBranchContextType = {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
};

const MessageBranchContext = createContext<MessageBranchContextType | null>(null);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error("MessageBranch components must be used within MessageBranch");
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = (newBranch: number) => {
    setCurrentBranch(newBranch);
    onBranchChange?.(newBranch);
  };

  const goToPrevious = () => {
    const newBranch = currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  };

  const goToNext = () => {
    const newBranch = currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  };

  const contextValue: MessageBranchContextType = {
    currentBranch,
    totalBranches: branches.length,
    goToPrevious,
    goToNext,
    branches,
    setBranches,
  };

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn(`${LAYOUT.grid} ${SIZE.wFull} ${SPACING.gap2} [&>div]:pb-0`, className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({ children, ...props }: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        `${LAYOUT.grid} ${SPACING.gap2} ${OVERFLOW.hidden} [&>div]:pb-0`,
        index === currentBranch ? DISPLAY.block : DISPLAY.hidden
      )}
      key={branch.key}
      {...props}>
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const MessageBranchSelector = ({ ...props }: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md"
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({ children, ...props }: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}>
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({ children, ...props }: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}>
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({ className, ...props }: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(`${BORDER.none} ${BG.transparent} ${TEXT.muted} shadow-none`, className)}
      {...props}>
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(`${SIZE.full} [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`, className)}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";

export type MessageAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
  className?: string;
  onRemove?: () => void;
};

export function MessageAttachment({ data, className, onRemove, ...props }: MessageAttachmentProps) {
  const filename = data.filename || "";
  const mediaType = data.mediaType?.startsWith("image/") && data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");

  return (
    <div
      className={cn(
        `group ${POSITION.relative} ${SIZE.size24} ${OVERFLOW.hidden} ${BORDER.rounded.lg}`,
        className
      )}
      {...props}>
      {isImage ? (
        <>
          <NextImage
            alt={filename || "attachment"}
            className={`${SIZE.full} object-cover`}
            height={100}
            src={data.url}
            width={100}
          />
          {onRemove && (
            <Button
              aria-label="Remove attachment"
              className={`${POSITION.absolute} top-2 right-2 ${SIZE.size6} ${BORDER.rounded.full} bg-background/80 p-0 opacity-0 backdrop-blur-sm ${TRANSITION.opacity} ${INTERACTIVE.hover.accent} group-hover:opacity-100 [&>svg]:size-3`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              type="button"
              variant="ghost">
              <XIcon />
              <span className={DISPLAY.srOnly}>Remove</span>
            </Button>
          )}
        </>
      ) : (
        <>
          <DelayedTooltip>
            <TooltipTrigger asChild>
              <div
                className={`${LAYOUT.containerCentered} ${SIZE.full} shrink-0 ${BORDER.rounded.lg} ${BG.muted} ${TEXT.muted}`}>
                <PaperclipIcon className={SIZE.size4} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{attachmentLabel}</p>
            </TooltipContent>
          </DelayedTooltip>
          {onRemove && (
            <Button
              aria-label="Remove attachment"
              className={`${SIZE.size6} shrink-0 ${BORDER.rounded.full} p-0 opacity-0 ${TRANSITION.opacity} ${INTERACTIVE.hover.accent} group-hover:opacity-100 [&>svg]:size-3`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              type="button"
              variant="ghost">
              <XIcon />
              <span className={DISPLAY.srOnly}>Remove</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export type MessageAttachmentsProps = ComponentProps<"div">;

export function MessageAttachments({ children, className, ...props }: MessageAttachmentsProps) {
  if (!children) {
    return null;
  }

  return (
    <div
      className={cn(`ml-auto flex w-fit flex-wrap ${ALIGN.itemsStart} ${SPACING.gap2}`, className)}
      {...props}>
      {children}
    </div>
  );
}

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({ className, children, ...props }: MessageToolbarProps) => (
  <div
    className={cn(
      `${SPACING.mt4} flex ${SIZE.wFull} ${ALIGN.itemsCenter} ${ALIGN.justifyBetween} ${SPACING.gap4}`,
      className
    )}
    {...props}>
    {children}
  </div>
);
