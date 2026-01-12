/**
 * Generic Agent Implementation for AI SDK
 *
 * This module provides a reusable agent implementation that follows
 * ai-sdk best practices and is completely agnostic to the tools used.
 *
 * Key features:
 * - Tool-agnostic: Works with any set of tools or no tools
 * - Configurable: Supports all generateText/streamText options
 * - Type-safe: Full TypeScript support
 * - Error handling: Comprehensive error handling with AgentError
 * - Streaming: Support for both generate() and stream() modes
 * - Loop control: Automatic tool loop management with configurable stop conditions
 *
 * @example Basic text-only agent
 * ```ts
 * import { Agent } from '@/lib/agent/agent';
 * import { openai } from '@ai-sdk/openai';
 *
 * const agent = new Agent({
 *   model: openai('gpt-4'),
 *   instructions: 'You are a helpful assistant'
 * });
 *
 * const result = await agent.generate({
 *   prompt: 'Hello!'
 * });
 * ```
 *
 * @example Agent with tools
 * ```ts
 * import { Agent } from '@/lib/agent/agent';
 * import { tool } from 'ai';
 * import { z } from 'zod';
 *
 * const agent = new Agent({
 *   model: openai('gpt-4'),
 *   instructions: 'You are a weather assistant',
 *   tools: {
 *     getWeather: tool({
 *       description: 'Get weather',
 *       inputSchema: z.object({ city: z.string() }),
 *       execute: async ({ city }) => ({ temp: 72 })
 *     })
 *   }
 * });
 *
 * const result = await agent.generate({
 *   prompt: 'What is the weather in Tokyo?'
 * });
 * ```
 *
 * @example Streaming responses
 * ```ts
 * const stream = await agent.stream({
 *   prompt: 'Tell me a story'
 * });
 *
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */

export { Agent } from "./index";
export type {
  AgentConfig,
  AgentGenerateOptions,
  AgentStreamOptions,
  AgentResult,
  AgentStep,
} from "./types";
export { AgentError } from "./types";
export {
  uiMessagesToAgentOptions,
  createAgentResponseHandler,
  handleAgentError,
  createStreamingResponse,
  retryAgentOperation,
  createTextAgent,
} from "./utils";
