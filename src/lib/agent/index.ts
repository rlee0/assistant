import type {
  AgentConfig,
  AgentGenerateOptions,
  AgentResult,
  AgentStep,
  AgentStreamOptions,
} from "./types";
import { AgentError, validateAgentConfig } from "./types";
import { generateText, streamText } from "ai";

/**
 * Generic Agent class following ai-sdk best practices.
 *
 * Provides a reusable, tool-agnostic agent that:
 * - Automatically manages tool loops for multi-step reasoning
 * - Handles both one-shot generation and streaming modes
 * - Provides comprehensive error handling and logging
 * - Maintains type safety throughout
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   model: openai('gpt-4'),
 *   instructions: 'You are a helpful assistant',
 *   tools: myTools,
 * });
 *
 * const result = await agent.generate({ prompt: 'Hello!' });
 * console.log(result.text);
 * ```
 */
export class Agent {
  private readonly config: Required<
    Pick<AgentConfig, "model" | "instructions" | "tools" | "maxSteps">
  > &
    Omit<AgentConfig, "model" | "instructions" | "tools" | "maxSteps">;

  constructor(config: AgentConfig) {
    // Validate configuration parameters
    validateAgentConfig(config);

    this.config = {
      model: config.model,
      instructions: config.instructions ?? "",
      tools: config.tools ?? {},
      maxSteps: config.maxSteps ?? 20,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty,
      toolChoice: config.toolChoice,
    };
  }

  /**
   * Generate a single response from the agent
   * Uses the agent loop to call tools as needed
   *
   * @param options - Generation options including prompt and context
   * @returns Result with final text and execution steps
   */
  async generate(options: AgentGenerateOptions): Promise<AgentResult> {
    try {
      const messages = this.buildMessages(options);

      const result = await generateText({
        model: this.config.model,
        messages,
        tools: this.config.tools,
        temperature: this.config.temperature,
        topP: this.config.topP,
        presencePenalty: this.config.presencePenalty,
        frequencyPenalty: this.config.frequencyPenalty,
        toolChoice: this.config.toolChoice,
      });

      const steps = this.extractSteps(result);

      return {
        text: result.text,
        steps,
        stepCount: steps.length,
        completed: result.finishReason !== "tool-calls",
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new AgentError(`Failed to generate response: ${err.message}`, {
        cause: err,
        code: "GENERATION_ERROR",
      });
    }
  }

  /**
   * Stream a response from the agent
   * Returns an async iterable for text chunks
   *
   * @param options - Streaming options including prompt, context, and callbacks
   * @returns Async iterable of text chunks
   */
  async stream(options: AgentStreamOptions): Promise<AsyncIterable<string>> {
    try {
      const messages = this.buildMessages(options);

      options.onStart?.();

      const result = streamText({
        model: this.config.model,
        messages,
        tools: this.config.tools,
        temperature: this.config.temperature,
        topP: this.config.topP,
        presencePenalty: this.config.presencePenalty,
        frequencyPenalty: this.config.frequencyPenalty,
        toolChoice: this.config.toolChoice,
        onFinish: () => {
          options.onFinish?.();
        },
      });

      return result.textStream;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const agentError = new AgentError(`Failed to stream response: ${err.message}`, {
        cause: err,
        code: "STREAMING_ERROR",
      });
      options.onError?.(agentError);
      throw agentError;
    }
  }

  /**
   * Build messages array from options
   * Includes system instructions and optional context
   */
  private buildMessages(options: AgentGenerateOptions | AgentStreamOptions): {
    role: "system" | "user";
    content: string;
  }[] {
    const messages: { role: "system" | "user"; content: string }[] = [];

    // Add system instructions if provided
    if (this.config.instructions) {
      messages.push({
        role: "system",
        content: this.config.instructions,
      });
    }

    // Add context if provided
    if (options.context) {
      messages.push({
        role: "system",
        content: `Context: ${options.context}`,
      });
    }

    // Add user prompt
    messages.push({
      role: "user",
      content: options.prompt,
    });

    return messages;
  }

  /**
   * Extract execution steps from generation result.
   * Converts tool calls and responses into a structured step history.
   *
   * @internal
   */
  private extractSteps(result: Awaited<ReturnType<typeof generateText>>): AgentStep[] {
    const steps: AgentStep[] = [];
    let stepNumber = 0;

    if (result.response?.messages) {
      for (const message of result.response.messages) {
        if (message.role === "assistant") {
          stepNumber++;

          if ("content" in message && typeof message.content === "string" && message.content) {
            steps.push({
              type: "text",
              stepNumber,
              text: message.content,
            });
          }

          if ("toolCalls" in message && Array.isArray(message.toolCalls)) {
            for (const toolCall of message.toolCalls) {
              stepNumber++;
              steps.push({
                type: "tool-call",
                stepNumber,
                toolName: toolCall.toolName,
                toolInput: toolCall.args,
              });
            }
          }
        } else if (message.role === "tool") {
          stepNumber++;
          const toolId = "toolCallId" in message ? String(message.toolCallId) : "unknown";
          steps.push({
            type: "tool-result",
            stepNumber,
            toolName: toolId,
            toolOutput: message.content,
          });
        }
      }
    }

    // Fallback: if no steps extracted, use final text
    if (steps.length === 0 && result.text) {
      steps.push({
        type: "text",
        stepNumber: 1,
        text: result.text,
      });
    }

    return steps;
  }

  /**
   * Get the current configuration
   * Useful for debugging or introspection
   */
  getConfig(): Readonly<AgentConfig> {
    return { ...this.config };
  }

  /**
   * Create a new agent with updated configuration
   * Original agent is not modified (immutable pattern)
   */
  withConfig(updates: Partial<AgentConfig>): Agent {
    return new Agent({
      ...this.config,
      ...updates,
    });
  }
}
