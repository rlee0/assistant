"use client";

import { useEffect, useRef, useCallback } from "react";
import { type UIMessage } from "ai";
import { useChatStore } from "../store/chat-store";
import { useSettingsStore } from "@/lib/settings/store";
import { DEFAULT_SUGGESTIONS_MODEL } from "@/lib/constants/models";
import { logError, logDebug } from "@/lib/logging";
import { API_ROUTES } from "@/lib/api/routes";

interface SuggestionsResponse {
  suggestions: string[];
}

/**
 * Type guard to validate suggestions response with strict content validation
 */
function isSuggestionsResponse(value: unknown): value is SuggestionsResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    !("suggestions" in value) ||
    !Array.isArray((value as Record<string, unknown>).suggestions)
  ) {
    return false;
  }

  const suggestions = (value as Record<string, unknown>).suggestions as unknown[];
  return suggestions.every(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0 && item.length <= 100
  );
}

/**
 * Hook to manage suggestion generation and lifecycle
 *
 * Features:
 * - Generates suggestions when status becomes "ready"
 * - Respects settings.suggestions.enabled toggle
 * - Uses configured suggestions model from settings
 * - Updates conversation.suggestions in store
 * - Cancels in-flight requests on cleanup
 * - Silent error handling (no user-facing errors)
 *
 * @param conversationId - Current conversation ID
 * @param messages - Current conversation messages
 * @param status - Current conversation status
 */
export function useSuggestions(
  conversationId: string | null,
  messages: UIMessage[],
  status: string
) {
  const setSuggestions = useChatStore((state) => state.setSuggestions);
  const setSuggestionsLoading = useChatStore((state) => state.setSuggestionsLoading);
  const clearSuggestions = useChatStore((state) => state.clearSuggestions);
  const settingsLoaded = useSettingsStore((state) => state.isLoaded);
  const suggestionsEnabled = useSettingsStore((state) => state.settings.suggestions.enabled);
  const suggestionsModel = useSettingsStore((state) => state.settings.suggestions.model);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(false);
  const lastGeneratedForRef = useRef<string | null>(null);

  /**
   * Generate suggestions from API
   */
  const generateSuggestions = useCallback(
    async (convId: string, msgs: UIMessage[], model: string) => {
      // Prevent duplicate requests
      if (isGeneratingRef.current) {
        logDebug("[Suggestions]", "Already generating, skipping");
        return;
      }

      // Create unique identifier for this generation
      const generationId = `${convId}-${msgs.length}`;
      if (lastGeneratedForRef.current === generationId) {
        logDebug("[Suggestions]", "Already generated for this state, skipping");
        return;
      }

      isGeneratingRef.current = true;
      setSuggestionsLoading(convId, true);

      try {
        // Cancel any in-flight request
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        logDebug("[Suggestions]", `Generating suggestions for conversation ${convId}`);

        const response = await fetch(API_ROUTES.SUGGESTIONS, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: msgs,
            model,
          }),
          signal: abortControllerRef.current.signal,
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // Use type guard to validate response structure and content
        if (!isSuggestionsResponse(data)) {
          throw new Error("Invalid response format: expected {suggestions: string[]}");
        }

        // Update store with suggestions
        setSuggestions(convId, data.suggestions);
        lastGeneratedForRef.current = generationId;

        logDebug("[Suggestions]", `Generated ${data.suggestions.length} suggestions`);
      } catch (error) {
        // Silent failure - don't show error to user, but log for debugging
        if (error instanceof Error && error.name === "AbortError") {
          logDebug("[Suggestions]", "Request cancelled");
        } else if (error instanceof Error) {
          logError("[Suggestions]", "Failed to generate suggestions", error, {
            conversationId: convId,
            model: model,
            reason: error.message,
          });
        } else {
          logError("[Suggestions]", "Failed to generate suggestions", new Error("Unknown error"), {
            conversationId: convId,
            model: model,
          });
        }
      } finally {
        isGeneratingRef.current = false;
        setSuggestionsLoading(convId, false);
      }
    },
    [setSuggestions, setSuggestionsLoading]
  );

  /**
   * Trigger suggestion generation when status becomes "ready"
   */
  useEffect(() => {
    // Only generate if:
    // 1. Settings are loaded
    // 2. Suggestions are enabled
    // 3. We have a conversation ID
    // 4. Status is "idle" (ready)
    // 5. We have at least one message
    if (
      !settingsLoaded ||
      !suggestionsEnabled ||
      !conversationId ||
      status !== "idle" ||
      messages.length === 0
    ) {
      return;
    }

    // Compute effective model with fallback to suggestions default
    const effectiveModel =
      typeof suggestionsModel === "string" && suggestionsModel.trim().length > 0
        ? suggestionsModel
        : DEFAULT_SUGGESTIONS_MODEL;

    // Generate suggestions
    void generateSuggestions(conversationId, messages, effectiveModel);
  }, [
    conversationId,
    messages,
    status,
    suggestionsEnabled,
    suggestionsModel,
    settingsLoaded,
    generateSuggestions,
  ]);

  /**
   * Clear suggestions when conversation changes or component unmounts
   */
  useEffect(() => {
    return () => {
      // Cancel any in-flight request
      abortControllerRef.current?.abort();
      isGeneratingRef.current = false;
      lastGeneratedForRef.current = null;
    };
  }, [conversationId]);

  /**
   * Clear suggestions when disabled in settings
   * Note: clearSuggestions identity is unstable, so we depend on conversationId change
   */
  useEffect(() => {
    if (!suggestionsEnabled && conversationId) {
      clearSuggestions(conversationId);
    }
  }, [suggestionsEnabled, conversationId]);

  return {
    /**
     * Manually trigger suggestion generation
     */
    generateSuggestions: useCallback(() => {
      if (conversationId && messages.length > 0) {
        const effectiveModel =
          typeof suggestionsModel === "string" && suggestionsModel.trim().length > 0
            ? suggestionsModel
            : DEFAULT_SUGGESTIONS_MODEL;
        void generateSuggestions(conversationId, messages, effectiveModel);
      }
    }, [conversationId, messages, suggestionsModel, generateSuggestions]),

    /**
     * Clear suggestions for current conversation
     */
    clearSuggestions: useCallback(() => {
      if (conversationId) {
        clearSuggestions(conversationId);
      }
    }, [conversationId, clearSuggestions]),
  };
}
