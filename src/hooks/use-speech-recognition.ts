/**
 * Custom hook for managing Speech Recognition
 * Handles microphone input, transcription, and intelligent text insertion
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { RefObject } from "react";
import type { SpeechRecognition } from "@/components/ai/types/speech-recognition";
import { logError } from "@/lib/logging";

// Regex patterns - compiled once at module level for performance
const PUNCTUATION_NO_SPACE_REGEX = /^[.,!?;:)\]}]/;
const TRAILING_SPACE_REGEX = /\s$/;

export interface UseSpeechRecognitionOptions {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onTranscriptionChange?: (text: string) => void;
}

export const useSpeechRecognition = ({
  textareaRef,
  onTranscriptionChange,
}: UseSpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechRecognition = new SpeechRecognition();

      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = "en-US";

      speechRecognition.onstart = () => {
        setIsListening(true);
      };

      speechRecognition.onend = () => {
        setIsListening(false);
      };

      speechRecognition.onresult = (event) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0]?.transcript ?? "";
          }
        }

        if (finalTranscript && textareaRef?.current) {
          const textarea = textareaRef.current;
          const cursorPosition = textarea.selectionStart;
          const beforeCursor = textarea.value.slice(0, cursorPosition);
          const afterCursor = textarea.value.slice(cursorPosition);

          // Determine if we need a space before the transcription
          const endsWithSpace = TRAILING_SPACE_REGEX.test(beforeCursor);
          const startsWithPunctuation = PUNCTUATION_NO_SPACE_REGEX.test(finalTranscript);

          let spacer = "";
          if (beforeCursor && !endsWithSpace && !startsWithPunctuation) {
            spacer = " ";
          }

          const insertText = spacer + finalTranscript.trimStart();
          const newValue = beforeCursor + insertText + afterCursor;
          const newCursorPosition = cursorPosition + insertText.length;

          textarea.value = newValue;
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          onTranscriptionChange?.(newValue);
        }
      };

      speechRecognition.onerror = (event) => {
        logError("[useSpeechRecognition]", "Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = speechRecognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [textareaRef, onTranscriptionChange]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current || !textareaRef?.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      // Focus textarea and move cursor to end
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [isListening, textareaRef]);

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return {
    isListening,
    toggleListening,
    hasSpeechRecognition,
  };
};
