# Generic Agent Implementation

A reusable, tool-agnostic agent implementation following AI SDK best practices. This agent wraps the AI SDK's tool loop functionality and provides a clean, type-safe interface for building AI agents.

## Features

- **Tool-Agnostic**: Works with any set of tools or no tools at all
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Configurable**: Supports all `generateText` and `streamText` options
- **Error Handling**: Comprehensive error handling with `AgentError`
- **Streaming Support**: Both one-shot `generate()` and streaming `stream()` modes
- **Best Practices**: Follows AI SDK recommendations for agent implementation

## Installation

The agent is part of the lib/agent module:

```typescript
import { Agent, createTextAgent } from "@/lib/agent/agent";
```

## Quick Start

### Basic Text-Only Agent

```typescript
import { Agent } from "@/lib/agent/agent";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a helpful AI assistant.",
});

const result = await agent.generate({
  prompt: "What is the capital of France?",
});

console.log(result.text); // "The capital of France is Paris."
```

### Agent with Tools

```typescript
import { Agent } from "@/lib/agent/agent";
import { tool } from "ai";
import { z } from "zod";

const agent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a weather assistant.",
  tools: {
    getWeather: tool({
      description: "Get weather for a location",
      inputSchema: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        // Your weather API logic
        return { temp: 72, conditions: "sunny" };
      },
    }),
  },
});

const result = await agent.generate({
  prompt: "What's the weather in Tokyo?",
});

// Agent automatically calls the tool and incorporates the result
console.log(result.text);
console.log(result.steps); // See execution steps
```

### Streaming Responses

```typescript
const stream = await agent.stream({
  prompt: "Tell me a story",
  onStart: () => console.log("Starting..."),
  onFinish: () => console.log("Done!"),
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

## API Reference

### `Agent` Class

#### Constructor Options (`AgentConfig`)

```typescript
interface AgentConfig {
  model: LanguageModel; // Required: The LLM to use
  instructions?: string; // System instructions
  tools?: Record<string, Tool>; // Tools available to agent
  stopWhen?: AnyStopCondition | AnyStopCondition[]; // Loop control
  toolChoice?: "auto" | "required" | "none" | { type: "tool"; toolName: string };
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}
```

#### Methods

##### `generate(options: AgentGenerateOptions): Promise<AgentResult>`

Generate a single response. The agent will automatically call tools as needed.

```typescript
const result = await agent.generate({
  prompt: "Your question",
  context: "Optional additional context",
});

console.log(result.text); // Final response
console.log(result.steps); // Execution steps
console.log(result.stepCount); // Number of steps
```

##### `stream(options: AgentStreamOptions): AsyncIterable<string>`

Stream responses in real-time.

```typescript
const stream = await agent.stream({
  prompt: "Your question",
  onStart: () => {},
  onFinish: () => {},
  onError: (error) => {},
});
```

##### `withConfig(updates: Partial<AgentConfig>): Agent`

Create a new agent with updated configuration (immutable pattern).

```typescript
const newAgent = agent.withConfig({
  temperature: 0.5,
  instructions: "New instructions",
});
```

##### `getConfig(): Readonly<AgentConfig>`

Get the current configuration for debugging or introspection.

## Utility Functions

### `createTextAgent(model, instructions?)`

Quick helper for creating a text-only agent (no tools).

```typescript
import { createTextAgent } from "@/lib/agent/agent";

const agent = createTextAgent(openai("gpt-4"), "You are helpful.");
```

### `uiMessagesToAgentOptions(messages, context?)`

Convert UI messages from `useChat` to agent options.

```typescript
import { uiMessagesToAgentOptions } from "@/lib/agent/agent";

const options = await uiMessagesToAgentOptions(messages, "Context");
const result = await agent.generate(options);
```

### `createStreamingResponse(agent, options)`

Create a streaming HTTP response for API routes.

```typescript
import { createStreamingResponse } from "@/lib/agent/agent";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  return createStreamingResponse(agent, { prompt });
}
```

### `retryAgentOperation(operation, maxRetries?, baseDelay?)`

Retry an agent operation with exponential backoff.

```typescript
import { retryAgentOperation } from "@/lib/agent/agent";

const result = await retryAgentOperation(
  () => agent.generate({ prompt: "..." }),
  3, // max retries
  1000 // base delay in ms
);
```

## Error Handling

The agent throws `AgentError` for all failures:

```typescript
import { AgentError } from "@/lib/agent/agent";

try {
  const result = await agent.generate({ prompt: "..." });
} catch (error) {
  if (error instanceof AgentError) {
    console.error("Agent failed:", error.message);
    console.error("Caused by:", error.cause);
    console.error("Step number:", error.stepNumber);
  }
}
```

## Advanced Usage

### Custom Loop Control

```typescript
import { stepCountIs } from "ai";

const agent = new Agent({
  model: openai("gpt-4"),
  stopWhen: stepCountIs(10), // Allow up to 10 steps
});
```

### Tool Choice Control

```typescript
// Require tool use
const agent = new Agent({
  model: openai("gpt-4"),
  tools: myTools,
  toolChoice: "required",
});

// Force specific tool
const agent = new Agent({
  model: openai("gpt-4"),
  tools: myTools,
  toolChoice: { type: "tool", toolName: "weatherTool" },
});
```

### Context Management

```typescript
const result = await agent.generate({
  prompt: "Recommend a movie",
  context: "User loves sci-fi and recently watched Inception",
});
```

## Integration with API Routes

```typescript
// app/api/chat/route.ts
import { Agent } from "@/lib/agent/agent";
import { createStreamingResponse } from "@/lib/agent/agent";
import { buildTools } from "@/tools";

const agent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a helpful assistant",
  tools: buildTools(toolSettings),
});

export async function POST(req: Request) {
  const { prompt, context } = await req.json();

  return createStreamingResponse(agent, {
    prompt,
    context,
  });
}
```

## Examples

See [examples.ts](./examples.ts) for comprehensive examples including:

- Text-only agents
- Agents with tools
- Streaming responses
- Custom configuration
- Context handling
- Error handling
- Reusable agent patterns
- Dynamic tool sets

## Design Principles

1. **Tool Agnostic**: The agent doesn't care what tools you provide. It works with any tool set or no tools at all.

2. **Immutable Configuration**: Use `withConfig()` to create new agents rather than modifying existing ones.

3. **Type Safety**: Full TypeScript support ensures you catch errors at compile time.

4. **Error Recovery**: Comprehensive error handling with detailed error messages.

5. **Best Practices**: Follows AI SDK recommendations for agent implementation, including:
   - Proper message formatting
   - Tool loop management
   - Stop condition handling
   - Stream lifecycle management

## Testing

```typescript
// Mock the model for testing
const mockModel = {
  /* your mock implementation */
};

const agent = new Agent({
  model: mockModel as any,
  instructions: "Test instructions",
});

const result = await agent.generate({ prompt: "test" });
expect(result.text).toBe("expected response");
```

## Contributing

When adding new features:

1. Update types in `types.ts`
2. Implement in `index.ts`
3. Add utilities to `utils.ts` if needed
4. Add examples to `examples.ts`
5. Update this README

## License

Part of the assistant project.
