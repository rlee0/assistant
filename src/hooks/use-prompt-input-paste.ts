/**
 * Custom hook for handling prompt input paste events
 * Extracts files from clipboard and adds them as attachments
 */

import { useCallback, type ClipboardEventHandler } from "react";

export interface UsePromptInputPasteOptions {
  onFilesAdded?: (files: File[]) => void;
}

export const usePromptInputPaste = ({
  onFilesAdded,
}: UsePromptInputPasteOptions): ClipboardEventHandler<HTMLTextAreaElement> => {
  return useCallback<ClipboardEventHandler<HTMLTextAreaElement>>(
    (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        onFilesAdded?.(pastedFiles);
      }
    },
    [onFilesAdded]
  );
};
