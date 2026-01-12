import { LanguageModel, ModelMessage, UIMessage, convertToModelMessages } from "ai";

import { Agent } from "./index";
import { AgentError } from "./types";
import type { AgentGenerateOptions } from "./types";

/**
 * Convert UI messages from useChat hook to agent generation options.
 * Extracts the last user message as the prompt for agent execution.
 *
 * @param messages - UI messages from useChat hook
 * @param context - Optional additional context for the agent
 * @returns Agent generation options ready for execution
 * @throws {AgentError} If no user message is found in the messages array
 *
 * @example
 * ```ts
 * const options = await uiMessagesToAgentOptions(messages);
 * const result = await agent.generate(options);
 * ```
 */
export async function uiMessagesToAgentOptions(
  messages: UIMessage[],
  context?: string
): Promise<AgentGenerateOptions> {
  if (!messages || messages.length === 0) {
    throw new AgentError("Messages array is empty", { code: "EMPTY_MESSAGES" });
  }

  const modelMessages = await convertToModelMessages(messages);

  const lastUserMessage = modelMessages.reverse().find((m): m is ModelMessage => m.role === "user");

  if (!lastUserMessage) {
    throw new AgentError("No user message found in messages array", {
      code: "NO_USER_MESSAGE",
    });
  }

  const prompt =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : Array.isArray(lastUserMessage.content)
      ? lastUserMessage.content
          .filter(
            (p: { type: string }): p is { type: "text"; text: string } =>
              p.type === "text" && typeof (p as { type: string; text?: string }).text === "string"
          )
          .map((p) => p.text)
          .join("\n")
      : "";

  if (!prompt) {
    throw new AgentError("Could not extract valid prompt from messages", {
      code: "INVALID_PROMPT",
    });
  }

  return { prompt, context };
}

/**
 * Create an agent response handler for HTTP API routes.
 * Converts agent stream responses into proper HTTP Response objects.
 *
 * @param agent - Configured agent instance
 * @returns Handler function accepting generation options and returning HTTP Response
 *
 * @example
 * ```ts
 * const handler = createAgentResponseHandler(agent);
 * const response = await handler({ prompt: 'Hello' });
 * ```
 */
export function createAgentResponseHandler(agent: Agent) {
  return async (options: AgentGenerateOptions): Promise<Response> => {
    try {
      const stream = await agent.stream(options);
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (error) {
            controller.error(error instanceof Error ? error : new Error(String(error)));
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    } catch (error) {
      return handleAgentError(error);
    }
  };
}

/**
 * Format agent errors into standardized HTTP Response objects.
 * Provides consistent error representation for API consumers.
 *
 * @param error - Unknown error to handle and format
 * @returns HTTP Response with error details (status 500)
 *
 * @example
 * ```ts
 * try {
 *   // ...
 * } catch (error) {
 *   return handleAgentError(error);
 * }
 * ```
 */
export function handleAgentError(error: unknown): Response {
  const formatError = (): {
    message: string;
    code?: string;
    type: string;
  } => {
    if (error instanceof AgentError) {
      return {
        message: error.message,
        code: error.code,
        type: "AgentError",
      };
    }
    if (error instanceof Error) {
      return {
        message: error.message,
        type: error.constructor.name,
      };
    }
    return {
      message: String(error),
      type: typeof error,
    };
  };

  const errorData = formatError();

  return new Response(JSON.stringify(errorData), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a streaming Response for browser/client consumption.
 * Properly handles agent streaming with error recovery.
 *
 * @param agent - Agent instance to execute
 * @param options - Generation options
 * @returns Streaming HTTP Response
 *
 * @example
 * ```ts
 * export async function POST(req: Request) {
 *   const { prompt } = await req.json();
 *   return createStreamingResponse(agent, { prompt });
 * }
 * ```
 */
export async function createStreamingResponse(
  agent: Agent,
  options: AgentGenerateOptions
): Promise<Response> {
  try {
    const stream = await agent.stream(options);
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleAgentError(error);
  }
}

/**
 * Retry an agent operation with exponential backoff.
 * Useful for transient errors like rate limiting or temporary network issues.
 *
 * Uses exponential backoff: delay = baseDelay * 2^attempt
 *
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Initial delay in milliseconds (default: 1000)
 * @returns Result of the operation on success
 * @throws Last error encountered if all retries fail
 *
 * @example
 * ```ts
 * const result = await retryAgentOperation(
 *   () => agent.generate({ prompt: '...' }),
 *   3,    // retry up to 3 times
 *   1000  // start with 1s delay
 * );
 * ```
 */
export async function retryAgentOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  if (maxRetries < 0 || !Number.isInteger(maxRetries)) {
    throw new TypeError("maxRetries must be a non-negative integer");
  }
  if (baseDelay < 0 || !Number.isInteger(baseDelay)) {
    throw new TypeError("baseDelay must be a non-negative integer");
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Operation failed after all retries");
}

/**
 * Create a simple text-only agent without tools.
 * Provides a convenient factory for basic conversational agents.
 *
 * @param model - The language model to use
 * @param instructions - Optional system instructions (defaults to helpful assistant)
 * @returns Configured agent ready for text generation
 *
 * @example
 * ```ts
 * const agent = createTextAgent(openai('gpt-4'));
 * const result = await agent.generate({ prompt: 'Hello!' });
 * ```
 */
export function createTextAgent(model: LanguageModel, instructions?: string): Agent {
  return new Agent({
    model,
    instructions: instructions ?? "You are a helpful AI assistant.",
    tools: {}, // Explicitly no tools
  });
}
