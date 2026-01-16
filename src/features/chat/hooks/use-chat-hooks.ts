"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from "react";
import { fetchModels, getModelProvider, groupModelsByProvider, type Model } from "@/lib/models";
import { logError, logWarn } from "@/lib/logging";
import { DEFAULT_PROVIDER } from "@/features/chat/constants";
import type { SelectedModelInfo, UseModelManagementReturn } from "../types";

/**
 * Manages model selection and fetching with validation
 * Fetches models once on mount and validates current selection against available models
 *
 * Features:
 * - Atomic cleanup using AbortController to prevent memory leaks and race conditions
 * - Validates model only once to prevent infinite loops
 * - Gracefully handles errors without throwing
 *
 * @throws Does not throw; gracefully handles errors with fallback
 */
export function useModelManagement(
  currentModel: string,
  onModelUpdate: (modelId: string) => void
): UseModelManagementReturn {
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const hasValidatedRef = useRef(false);
  const onModelUpdateRef = useRef(onModelUpdate);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    onModelUpdateRef.current = onModelUpdate;
  }, [onModelUpdate]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadModels = async (): Promise<void> => {
      try {
        setModelsLoading(true);
        const list = await fetchModels();

        if (signal.aborted) return;

        // Validate models array
        if (!Array.isArray(list) || list.length === 0) {
          logWarn("[Chat]", "Empty models list returned from API");
          setModels([]);
          setModelsLoading(false);
          return;
        }

        setModels(list);
        setModelsLoading(false);

        // Validate selected model is available (only once, use stable ref check)
        if (!hasValidatedRef.current && !list.some((m) => m.id === currentModel)) {
          hasValidatedRef.current = true;
          const firstModel = list[0];
          if (firstModel && "id" in firstModel) {
            onModelUpdateRef.current(firstModel.id);
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        logError("[Chat]", "Model loading failed", err);
        setModels([]);
        setModelsLoading(false);
      }
    };

    void loadModels();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [currentModel]);

  const selectedModelInfo = useMemo<SelectedModelInfo>(() => {
    const selected = models.find((m) => m.id === currentModel);
    return {
      name: selected?.name ?? currentModel,
      provider: selected ? getModelProvider(selected) : DEFAULT_PROVIDER,
    };
  }, [models, currentModel]);

  return { models, selectedModelInfo, modelsLoading };
}

/**
 * Memoizes grouped models by provider.
 * Prevents unnecessary re-grouping on every render.
 *
 * @param models - Array of available AI models
 * @returns Models grouped by provider name
 *
 * @example
 * ```ts
 * const groupedModels = useGroupedModels(models);
 * // { openai: [...], anthropic: [...] }
 * ```
 */
export function useGroupedModels(
  models: ReadonlyArray<Model>
): ReturnType<typeof groupModelsByProvider> {
  return useMemo(() => groupModelsByProvider(models), [models]);
}

/**
 * Handles keyboard shortcuts in textarea.
 *
 * @returns Stable callback reference for textarea keydown events
 *
 * @remarks
 * - Enter (without modifiers): Submit form
 * - Shift+Enter, Ctrl+Enter, Cmd+Enter: Insert newline
 *
 * The callback reference is stable across re-renders to prevent
 * unnecessary re-renders of the textarea component.
 *
 * @example
 * ```tsx
 * const handleKeyDown = useTextareaKeyboardShortcuts();
 * <textarea onKeyDown={handleKeyDown} />
 * ```
 */
export function useTextareaKeyboardShortcuts(): (e: KeyboardEvent<HTMLTextAreaElement>) => void {
  return useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      form?.requestSubmit();
    }
  }, []);
}

/**
 * Auto-focuses textarea on component mount (after hydration).
 *
 * @param textareaRef - Ref to the textarea element
 *
 * @remarks
 * Improves UX by allowing users to start typing immediately.
 * Focuses after hydration completes to avoid React hydration mismatch.
 */
export function useAutoFocusTextarea(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
): void {
  useEffect(() => {
    // Focus after hydration completes (next tick)
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [textareaRef]);
}
