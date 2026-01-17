"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type LanguageModelUsage, type UIMessage } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/features/chat/components/chat-sidebar";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import { useChatStore } from "@/features/chat/store/chat-store";
import { useSettingsSync } from "@/features/settings/hooks/use-settings-sync";
import { logError, logWarn, logDebug } from "@/lib/logging";
import { CHAT_REQUEST_TIMEOUT_MS } from "@/features/chat/constants";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useModelManagement, useAutoFocusTextarea } from "../hooks/use-chat-hooks";
import {
  generateTitleFromText,
  mapUseChatStatus,
  uiMessageToChatMessage,
  areMessagesEqual,
  extractTextFromMessage,
} from "../utils/message-utils";
import {
  persistConversation,
  createConversationRequest,
  deleteConversationRequest,
} from "../handlers/conversation-handlers";
import {
  findMessageIndex,
  validateMessageExists,
  validateEditText,
  validateRegenerateMessage,
} from "../handlers/message-handlers";
import type { ChatClientProps } from "../types";

// System message constants
const SYSTEM_MESSAGE_RESPONSE_STOPPED = "Response stopped by user." as const;

/**
 * Main chat interface component using AI SDK UI.
 *
 * @remarks
 * This component provides a production-ready chat interface with comprehensive
 * error handling, type safety, and performance optimizations. It follows AI SDK
 * best practices and React 19 patterns.
 *
 * @features
 * - **Streaming**: Real-time streaming responses with error recovery
 * - **Tool Calling**: Exhaustive state handling for tool invocations
 * - **Attachments**: Image file support with media type validation
 * - **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
 * - **Auto-scroll**: Automatic scrolling to latest messages
 * - **Model Selection**: Dynamic model selection with fallback validation
 * - **Error Handling**: Structured logging and graceful error recovery
 * - **Accessibility**: ARIA labels and keyboard navigation support
 *
 * @architecture
 * - Uses AI SDK's useChat hook for state management
 * - Implements atomic cleanup patterns with AbortController
 * - Follows separation of concerns (rendering, logic, state)
 * - Memoizes expensive computations to prevent unnecessary re-renders
 *
 * @performance
 * - Memoized sub-components minimize re-renders
 * - Efficient message part rendering with type guards
 * - Optimized auto-scroll using IntersectionObserver pattern
 * - RAF-free focus management using microtasks
 *
 * @example
 * ```tsx
 * import { ChatClient } from '@/components/chat-client';
 *
 * export default function Page() {
 *   return <ChatClient initialData={data} />;
 * }
 * ```
 *
 * @see {@link https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot AI SDK UI Documentation}
 */
export function ChatClient({ initialData, conversationId }: ChatClientProps) {
  const router = useRouter();

  // ============================================================================
  // Store & Settings
  // ============================================================================
  const {
    conversations,
    order,
    selectedId: storeSelectedId,
    status: conversationStatuses,
    hydrated,
    hydrate,
    select: selectConversationId,
    upsert: upsertConversation,
    updateMessages: updateConversationMessages,
    updateTitle: updateConversationTitle,
    setStatus: setConversationStatus,
    addCheckpoint: storeAddCheckpoint,
    restoreCheckpoint: storeRestoreCheckpoint,
    remove: removeConversation,
  } = useChatStore();

  useSettingsSync();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.update);
  const currentModel = settings.models.defaultModel;

  // ============================================================================
  // useChat Hook
  // ============================================================================
  const { messages, sendMessage, status, error, regenerate, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
    }),
    onError: (error) => {
      if (
        error instanceof Error &&
        "status" in error &&
        (error as { status?: number }).status === 401
      ) {
        logError("[Chat]", "Authentication required - redirecting to login", error);
        router.push("/login");
        return;
      }
      logError("[Chat]", "Transport error", error, {
        type: error?.constructor?.name,
      });
    },
    onFinish: (result) => {
      if (result.isError) {
        logError("[Chat]", "Message streaming error", new Error("Stream finished with error"), {
          finishReason: result.finishReason,
          isAbort: result.isAbort,
          isDisconnect: result.isDisconnect,
        });
      }

      // Add system message when response is aborted
      if (result.isAbort) {
        const systemMessage: UIMessage = {
          id: nanoid(),
          role: "system",
          parts: [
            {
              type: "text",
              text: SYSTEM_MESSAGE_RESPONSE_STOPPED,
            },
          ],
        };
        setMessages((prevMessages) => [...prevMessages, systemMessage]);
      }

      // Track usage from the latest message
      const latestMessage = result.message;
      const metadata =
        typeof latestMessage.metadata === "object" && latestMessage.metadata !== null
          ? (latestMessage.metadata as Record<string, unknown>)
          : undefined;
      const usage =
        metadata && typeof metadata.usage === "object" && metadata.usage !== null
          ? (metadata.usage as LanguageModelUsage)
          : undefined;

      if (usage) {
        setCumulativeUsage((prev) => ({
          inputTokens: (prev.inputTokens || 0) + (usage.inputTokens || 0),
          outputTokens: (prev.outputTokens || 0) + (usage.outputTokens || 0),
          totalTokens: (prev.totalTokens || 0) + (usage.totalTokens || 0),
          inputTokenDetails: {
            noCacheTokens: prev.inputTokenDetails.noCacheTokens,
            cacheReadTokens:
              (prev.inputTokenDetails.cacheReadTokens || 0) +
              (usage.inputTokenDetails?.cacheReadTokens || 0),
            cacheWriteTokens: prev.inputTokenDetails.cacheWriteTokens,
          },
          outputTokenDetails: {
            textTokens: prev.outputTokenDetails.textTokens,
            reasoningTokens:
              (prev.outputTokenDetails.reasoningTokens || 0) +
              (usage.outputTokenDetails?.reasoningTokens || 0),
          },
        }));
      }
    },
  });

  // ============================================================================
  // Local State
  // ============================================================================
  const [text, setText] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [cumulativeUsage, setCumulativeUsage] = useState<LanguageModelUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
  });

  // ============================================================================
  // Refs
  // ============================================================================
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingCreateRef = useRef<Promise<string> | null>(null);
  const statusChangeRef = useRef<ReturnType<typeof useChat>["status"]>(status);
  const loadedConversationIdRef = useRef<string | null>(null);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

  // ============================================================================
  // Hooks
  // ============================================================================
  const { models, selectedModelInfo, modelsLoading } = useModelManagement(
    currentModel,
    (modelId) => {
      updateSettings(["models", "defaultModel"], modelId);
    }
  );

  useAutoFocusTextarea(textareaRef);

  // ============================================================================
  // Initialization & Store Sync
  // ============================================================================

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Step 1: Hydrate store on mount or when user changes
  useEffect(() => {
    if (!initialData) return;
    // Always hydrate when initialData changes (user switched or data updated)
    // The hydrate function will detect user changes and clear old data
    hydrate(initialData);
  }, [initialData, hydrate]);

  // Step 2: Sync route conversationId with store selection
  useEffect(() => {
    if (!conversationId || conversationId === storeSelectedId) return;
    selectConversationId(conversationId);
  }, [conversationId, storeSelectedId, selectConversationId]);

  // Use route conversationId if provided, otherwise use store selectedId
  const selectedId = conversationId ?? storeSelectedId;

  // Step 3: Load conversation messages when selectedId or conversations change
  useEffect(() => {
    if (!hydrated) return;

    if (!selectedId) {
      loadedConversationIdRef.current = null;
      setMessages([]);
      return;
    }

    const conversation = conversations[selectedId];

    if (!conversation) {
      loadedConversationIdRef.current = null;
      setMessages([]);
      selectConversationId(null);
      return;
    }

    if (loadedConversationIdRef.current === selectedId) {
      return;
    }

    loadedConversationIdRef.current = selectedId;
    setMessages(conversation.messages || []);
  }, [selectedId, conversations, setMessages, hydrated, selectConversationId]);

  // Step 4: Sync messages from useChat back to store
  useEffect(() => {
    if (!selectedId) return;

    if (loadedConversationIdRef.current !== selectedId) return;

    const storedMessages = conversations[selectedId]?.messages;
    if (areMessagesEqual(storedMessages, messages)) return;

    updateConversationMessages(selectedId, messages);
  }, [messages, selectedId, conversations, updateConversationMessages]);

  // Step 5: Update conversation status
  useEffect(() => {
    if (selectedId) {
      setConversationStatus(selectedId, mapUseChatStatus(status));
    }
  }, [selectedId, setConversationStatus, status]);

  // Step 6: Auto-scroll to bottom when messages change or streaming starts
  useEffect(() => {
    if (!selectedId || !scrollToBottomRef.current) return;
    scrollToBottomRef.current();
  }, [messages, selectedId, status]);

  // Reset cumulative usage when switching conversations or starting new chat
  useEffect(() => {
    setCumulativeUsage({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    });
  }, [selectedId]);

  // ============================================================================
  // Persistence
  // ============================================================================

  const handlePersist = useCallback(
    async (conversationId: string): Promise<void> => {
      const conversation = conversations[conversationId];
      if (!conversation) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      await persistConversation(
        {
          conversationId,
          title: conversation.title,
          messages: messages.map(uiMessageToChatMessage),
          checkpoints: conversation.checkpoints,
        },
        abortControllerRef.current.signal
      );
    },
    [conversations, messages]
  );

  useEffect(() => {
    if (!selectedId) return;

    const previous = statusChangeRef.current;
    if ((previous === "streaming" || previous === "submitted") && status === "ready") {
      void handlePersist(selectedId);
    }
    statusChangeRef.current = status;
  }, [handlePersist, selectedId, status]);

  // ============================================================================
  // Checkpoints
  // ============================================================================

  useEffect(() => {
    if (!selectedId || messages.length === 0) return;

    const conversation = conversations[selectedId];
    if (!conversation) return;

    const checkpointIndices = messages.reduce<number[]>((acc, message, index) => {
      if (message.role === "user" && index > 0) {
        acc.push(index);
      }
      return acc;
    }, []);

    const existingIndices = new Set(conversation.checkpoints.map((cp) => cp.messageIndex));
    checkpointIndices.forEach((index) => {
      if (!existingIndices.has(index)) {
        storeAddCheckpoint(selectedId, index);
      }
    });
  }, [messages, selectedId, conversations, storeAddCheckpoint]);

  // ============================================================================
  // Event Handlers: Model & Selection
  // ============================================================================

  const handleModelSelect = useCallback(
    (modelId: string): void => {
      updateSettings(["models", "defaultModel"], modelId);
    },
    [updateSettings]
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (conversationId === selectedId) return;

      selectConversationId(conversationId);
      setText("");
      setEditingMessageId(null);
      setEditText("");
    },
    [selectConversationId, selectedId]
  );

  const resetUIState = useCallback((): void => {
    setText("");
    setEditingMessageId(null);
    setEditText("");
  }, []);

  // ============================================================================
  // Event Handlers: Conversation Management
  // ============================================================================

  const findExistingNewChat = useCallback((): string | null => {
    const candidateIds = selectedId
      ? [selectedId, ...order.filter((id) => id !== selectedId)]
      : order;

    for (const id of candidateIds) {
      const conversation = conversations[id];
      if (!conversation) continue;

      const hasDefaultTitle = !conversation.title || conversation.title === "New chat";
      const convMessages = conversation.messages ?? [];
      const hasUserMessages = convMessages.some((message) => message.role === "user");

      if (hasDefaultTitle && !hasUserMessages) {
        return id;
      }
    }

    return null;
  }, [conversations, order, selectedId]);

  const createConversation = useCallback(async (): Promise<string> => {
    if (pendingCreateRef.current) {
      return pendingCreateRef.current;
    }

    const createPromise = (async (): Promise<string> => {
      setCreatingChat(true);
      const timeoutId = setTimeout(
        () => abortControllerRef.current?.abort(),
        CHAT_REQUEST_TIMEOUT_MS
      );

      try {
        const conversationId = await createConversationRequest(
          { model: currentModel },
          abortControllerRef.current?.signal ?? new AbortController().signal
        );

        upsertConversation({
          id: conversationId,
          title: "New chat",
          messages: [],
          checkpoints: [],
          pinned: false,
          updatedAt: new Date().toISOString(),
          lastUserMessageAt: new Date().toISOString(),
          model: currentModel,
          suggestions: [],
        });
        selectConversationId(conversationId);
        router.push(`/chat/${conversationId}`);
        setMessages([]);
        resetUIState();
        return conversationId;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          logDebug("[Chat]", "Create conversation aborted");
          throw error;
        }

        logError("[Chat]", "Failed to create conversation", error);
        toast.error("Failed to create conversation. Please try again.");
        throw error;
      } finally {
        clearTimeout(timeoutId);
        setCreatingChat(false);
        pendingCreateRef.current = null;
      }
    })();

    pendingCreateRef.current = createPromise;
    return createPromise;
  }, [currentModel, selectConversationId, setMessages, upsertConversation, router, resetUIState]);

  const ensureConversation = useCallback(async () => {
    if (selectedId && conversations[selectedId]) return selectedId;
    return createConversation();
  }, [conversations, createConversation, selectedId]);

  /**
   * Handle new chat creation or navigation to existing empty chat.
   *
   * @returns Promise resolving to true if navigation occurred, false if already on target
   * @remarks
   * The return value is used by callers to manage progress bar state:
   * - true: Navigation occurred (progress bar auto-completes on pathname change)
   * - false: Already on target chat (caller must manually complete progress bar)
   */
  const handleNewChat = useCallback(async (): Promise<boolean> => {
    const existingNewChatId = findExistingNewChat();

    if (existingNewChatId) {
      if (existingNewChatId !== selectedId) {
        selectConversationId(existingNewChatId);
      }
      const alreadyOnTarget = conversationId === existingNewChatId;
      if (!alreadyOnTarget) {
        router.push(`/chat/${existingNewChatId}`);
      }
      resetUIState();
      textareaRef.current?.focus();
      return !alreadyOnTarget;
    }

    await createConversation();
    textareaRef.current?.focus();
    return true;
  }, [
    conversationId,
    createConversation,
    findExistingNewChat,
    resetUIState,
    router,
    selectConversationId,
    selectedId,
  ]);

  const handleCopyConversation = useCallback(
    async (conversationIdToCopy: string): Promise<void> => {
      try {
        const conversation = conversations[conversationIdToCopy];
        if (!conversation) {
          toast.error("Conversation not found");
          return;
        }

        const title = conversation.title || "Untitled chat";
        const messages = conversation.messages;

        // Format messages as markdown
        const messageText = messages
          .map((message) => {
            const role = message.role === "user" ? "User" : "Assistant";
            const content = extractTextFromMessage(message);
            return `**${role}:**\n${content}\n`;
          })
          .join("\n");

        const markdown = `# ${title}\n\n${messageText}`;

        await navigator.clipboard.writeText(markdown);
        toast.success("Conversation copied to clipboard");
      } catch (error) {
        logError("[Chat]", "Failed to copy conversation", error, { conversationIdToCopy });
        toast.error("Failed to copy conversation");
      }
    },
    [conversations]
  );

  const handleDeleteConversation = useCallback(
    async (conversationIdToDelete: string): Promise<void> => {
      setDeleting((prev) => ({ ...prev, [conversationIdToDelete]: true }));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);

      try {
        await deleteConversationRequest({ id: conversationIdToDelete }, controller.signal);

        removeConversation(conversationIdToDelete);

        if (conversationIdToDelete === conversationId) {
          const fallback = order.find((id) => id !== conversationIdToDelete) ?? null;
          selectConversationId(fallback);
          if (fallback) {
            router.push(`/chat/${fallback}`);
            const conversation = conversations[fallback];
            if (conversation) {
              setMessages(conversation.messages);
            }
          } else {
            // Only navigate if we're currently on a specific chat page
            // If conversationId is undefined, we're already on the root chat page
            if (conversationId) {
              router.push("/chat");
            }
            setMessages([]);
          }
        }

        toast.success("Conversation deleted");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          logDebug("[Chat]", "Delete conversation aborted", { conversationIdToDelete });
          return;
        }
        logError("[Chat]", "Delete conversation failed", err, { conversationIdToDelete });
        toast.error("Failed to delete conversation");
      } finally {
        clearTimeout(timeoutId);
        setDeleting((prev) => ({ ...prev, [conversationIdToDelete]: false }));
      }
    },
    [
      conversations,
      order,
      removeConversation,
      selectConversationId,
      conversationId,
      setMessages,
      router,
    ]
  );

  // ============================================================================
  // Event Handlers: Message Operations
  // ============================================================================

  const handlePromptSubmit = useCallback(
    async (message: Record<string, unknown>) => {
      const hasText = typeof message.text === "string" && message.text.trim().length > 0;
      const hasAttachments = Array.isArray(message.files) && message.files.length > 0;

      if (!(hasText || hasAttachments)) {
        logWarn("[Chat]", "Message submission blocked: no content");
        return;
      }

      if (status !== "ready") {
        logDebug("[Chat]", "Message submission blocked: not ready", { status });
        return;
      }

      try {
        const conversationId = await ensureConversation();
        const conversation = conversations[conversationId];

        if (conversation && (!conversation.title || conversation.title === "New chat")) {
          const generatedTitle = generateTitleFromText((message.text as string) ?? "");
          if (generatedTitle && generatedTitle !== conversation.title) {
            updateConversationTitle(conversationId, generatedTitle);
          }
        }

        const messageToSend = {
          text: ((message.text as string) ?? "").trim() || "[File attachment]",
          experimental_attachments: hasAttachments ? message.files : undefined,
        };

        sendMessage(messageToSend, {
          body: {
            model: currentModel,
          },
        });

        setText("");

        queueMicrotask(() => {
          scrollToBottomRef.current?.();
          textareaRef.current?.focus();
        });
      } catch (error) {
        logError("[Chat]", "Prompt submission failed", error);
        toast.error("Failed to send message. Please try again.");
      }
    },
    [conversations, currentModel, ensureConversation, sendMessage, status, updateConversationTitle]
  );

  const handleEditMessage = useCallback((messageId: string, initialText: string): void => {
    setEditText(initialText);
    setEditingMessageId(messageId);
  }, []);

  const handleCancelEdit = useCallback((): void => {
    setEditingMessageId(null);
    setEditText("");
  }, []);

  const handleSaveEdit = useCallback(
    (messageId: string, newText: string): void => {
      if (!validateEditText(newText)) {
        return;
      }

      const editIndex = validateMessageExists(messages, messageId);
      if (editIndex === null) {
        toast.error("Message not found. Please try again.");
        return;
      }

      const newMessages = messages.slice(0, editIndex);
      setMessages(newMessages);

      setEditingMessageId(null);
      setEditText("");

      sendMessage(
        { text: newText },
        {
          body: {
            model: currentModel,
          },
        }
      );

      toast.success("Message updated");
    },
    [messages, setMessages, sendMessage, currentModel]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string): void => {
      const deleteIndex = validateMessageExists(messages, messageId);
      if (deleteIndex === null) {
        toast.error("Message not found. Please try again.");
        return;
      }

      const newMessages = messages.slice(0, deleteIndex);
      setMessages(newMessages);
    },
    [messages, setMessages]
  );

  const handleRegenerateFromMessage = useCallback(
    (messageId: string): void => {
      if (!(status === "ready" || status === "error")) {
        logDebug("[Chat]", "Regenerate blocked: status", { status });
        return;
      }

      const targetIndex = findMessageIndex(messages, messageId);
      if (targetIndex === -1) {
        logWarn("[Chat]", "Regenerate failed: message not found", { messageId });
        return;
      }

      const targetMessage = messages[targetIndex];
      if (!validateRegenerateMessage(targetMessage)) {
        return;
      }

      try {
        const newMessages = messages.slice(0, targetIndex + 1);
        setMessages(newMessages);
        regenerate();
      } catch (error) {
        logError("[Chat]", "Regenerate failed", error, { messageId, targetIndex });
        toast.error("Failed to regenerate message.");
      }
    },
    [messages, setMessages, regenerate, status]
  );

  const handleRestoreCheckpoint = useCallback(
    async (checkpointId: string): Promise<void> => {
      if (!selectedId) return;

      const conversation = conversations[selectedId];
      if (!conversation) return;

      const checkpoint = conversation.checkpoints.find((cp) => cp.id === checkpointId);
      if (!checkpoint) {
        logWarn("[Chat]", "Checkpoint not found", { checkpointId });
        return;
      }

      if (checkpoint.messageIndex < 0 || checkpoint.messageIndex > messages.length) {
        logError("[Chat]", "Invalid checkpoint index", null, {
          checkpointId,
          messageIndex: checkpoint.messageIndex,
          messagesLength: messages.length,
        });
        toast.error("Failed to restore checkpoint");
        return;
      }

      try {
        storeRestoreCheckpoint(selectedId, checkpointId);

        const restoredMessages = messages.slice(0, checkpoint.messageIndex);
        setMessages(restoredMessages);

        // Filter checkpoints to keep only those before the restored checkpoint
        const restoredCheckpoints = conversation.checkpoints.filter(
          (cp) => cp.messageIndex < checkpoint.messageIndex
        );

        setEditingMessageId(null);
        setEditText("");

        // Persist the restoration to Supabase with both restored messages and checkpoints
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        await persistConversation(
          {
            conversationId: selectedId,
            title: conversation.title,
            messages: restoredMessages.map(uiMessageToChatMessage),
            checkpoints: restoredCheckpoints,
          },
          abortControllerRef.current.signal
        );

        toast.success("Conversation restored to checkpoint");
      } catch (error) {
        logError("[Chat]", "Restore checkpoint failed", error, { checkpointId });
        toast.error("Failed to restore checkpoint");
      }
    },
    [selectedId, conversations, messages, storeRestoreCheckpoint, setMessages]
  );

  // ============================================================================
  // Computed Values
  // ============================================================================

  const currentConversation = selectedId ? conversations[selectedId] : null;
  const conversationTitle = currentConversation?.title || "New chat";

  const lastMessageTimestamp = useMemo(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    let candidate: unknown = null;
    if (lastMessage && typeof lastMessage === "object" && lastMessage !== null) {
      const msg = lastMessage as unknown as Record<string, unknown>;
      candidate = "createdAt" in msg ? msg.createdAt : "created_at" in msg ? msg.created_at : null;
    }

    const parsed =
      candidate instanceof Date
        ? candidate
        : typeof candidate === "string"
          ? new Date(candidate as string)
          : null;

    if (parsed && !Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    if (currentConversation?.updatedAt) {
      const fallback = new Date(currentConversation.updatedAt);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }

    return null;
  }, [messages, currentConversation?.updatedAt]);

  const lastMessageLabel = useMemo(() => {
    if (!lastMessageTimestamp) return "";

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(lastMessageTimestamp);
  }, [lastMessageTimestamp]);

  const { totalUsedTokens, totalUsage } = useMemo(() => {
    return {
      totalUsedTokens: cumulativeUsage.totalTokens || 0,
      totalUsage: cumulativeUsage,
    };
  }, [cumulativeUsage]);

  const user = {
    name: settings.account.displayName,
    email: settings.account.email,
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SidebarProvider>
      <ChatSidebar
        user={user}
        conversations={conversations}
        conversationOrder={order}
        selectedId={selectedId}
        conversationStatuses={conversationStatuses}
        deleting={deleting}
        creatingChat={creatingChat}
        hydrated={hydrated}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onCopyConversation={handleCopyConversation}
      />
      <SidebarInset>
        <ChatHeader conversationTitle={conversationTitle} lastMessageLabel={lastMessageLabel} />
        <div className="flex flex-1 flex-col min-h-0">
          <ChatMessages
            messages={messages}
            status={status}
            error={error}
            messagesContainerRef={messagesContainerRef}
            editingMessageId={editingMessageId}
            editText={editText}
            hydrated={hydrated}
            scrollToBottomRef={scrollToBottomRef}
            checkpoints={currentConversation?.checkpoints ?? []}
            selectedId={selectedId}
            onNewChat={handleNewChat}
            onEditMessage={handleEditMessage}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onDeleteMessage={handleDeleteMessage}
            onEditTextChange={setEditText}
            onRegenerateFromMessage={handleRegenerateFromMessage}
            onRestoreCheckpoint={handleRestoreCheckpoint}
          />

          {!hydrated || !selectedId ? null : (
            <ChatInput
              text={text}
              onTextChange={setText}
              onSubmit={handlePromptSubmit}
              onStop={stop}
              status={status}
              selectedModelInfo={selectedModelInfo}
              currentModel={currentModel}
              selectorOpen={selectorOpen}
              onSelectorOpenChange={setSelectorOpen}
              models={models}
              modelsLoading={modelsLoading}
              onModelSelect={handleModelSelect}
              textareaRef={textareaRef}
              totalUsedTokens={totalUsedTokens}
              totalUsage={totalUsage}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
