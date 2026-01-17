/**
 * Custom hook for handling prompt input keyboard interactions
 * Manages Enter key submission, Backspace attachment removal, and composition events
 */

import { useCallback, type KeyboardEventHandler } from "react";

export interface UsePromptInputKeyboardOptions {
  onSubmit?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBackspace?: () => void;
  isComposing: boolean;
}

export const usePromptInputKeyboard = ({
  onSubmit,
  onBackspace,
  isComposing,
}: UsePromptInputKeyboardOptions): KeyboardEventHandler<HTMLTextAreaElement> => {
  return useCallback<KeyboardEventHandler<HTMLTextAreaElement>>(
    (e) => {
      if (e.key === "Enter") {
        if (isComposing || e.nativeEvent.isComposing) {
          return;
        }
        if (e.shiftKey) {
          return;
        }
        e.preventDefault();

        // Check if the submit button is disabled before submitting
        const form = e.currentTarget.form;
        const submitButton = form?.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement | null;
        if (submitButton?.disabled) {
          return;
        }

        onSubmit?.(e);
        form?.requestSubmit();
      }

      // Remove last attachment when Backspace is pressed and textarea is empty
      if (e.key === "Backspace") {
        const textarea = e.currentTarget;
        if (textarea.value === "" && onBackspace) {
          onBackspace();
        }
      }
    },
    [isComposing, onSubmit, onBackspace]
  );
};
