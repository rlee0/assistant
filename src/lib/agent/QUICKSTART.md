# Quick Start Guide

## 5-Minute Start

### 1. Import the Agent

```typescript
import { Agent } from "@/lib/agent/agent";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### 2. Create an Agent

```typescript
const agent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a helpful AI assistant.",
});
```

### 3. Use It

```typescript
// Generate a response
const result = await agent.generate({
  prompt: "What is TypeScript?",
});

console.log(result.text);
```

## With Tools

```typescript
import { tool } from "ai";
import { z } from "zod";
import { buildTools, defaultToolSettings } from "@/tools";

// Use your existing tools
const tools = buildTools(defaultToolSettings());

const agent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a helpful assistant with access to tools.",
  tools,
});

const result = await agent.generate({
  prompt: "Search for information about Next.js",
});
```

## Streaming

```typescript
const stream = await agent.stream({
  prompt: "Tell me about AI agents",
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

## In an API Route

```typescript
// app/api/agent/route.ts
import { Agent } from "@/lib/agent/agent";
import { createStreamingResponse } from "@/lib/agent/agent";
import { buildTools } from "@/tools";

const agent = new Agent({
  model: openai("gpt-4"),
  tools: buildTools(defaultToolSettings()),
});

export async function POST(req: Request) {
  const { prompt, context } = await req.json();

  return createStreamingResponse(agent, {
    prompt,
    context,
  });
}
```

## Advanced Features

### With Context

```typescript
const result = await agent.generate({
  prompt: "Recommend a movie",
  context: "User likes sci-fi and action movies",
});
```

### Custom Configuration

```typescript
const agent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a code reviewer",
  temperature: 0.3, // More deterministic
  maxSteps: 10, // Limit tool loops
  toolChoice: "auto", // Or 'required', 'none'
});
```

### Error Handling

```typescript
import { AgentError } from "@/lib/agent/agent";

try {
  const result = await agent.generate({ prompt: "..." });
} catch (error) {
  if (error instanceof AgentError) {
    console.error("Agent failed:", error.message);
  }
}
```

### Reusing Agents

```typescript
// Define once
const supportAgent = new Agent({
  model: openai("gpt-4"),
  instructions: "You are a customer support agent",
});

// Use many times
const queries = ["Order status?", "Return policy?"];
for (const query of queries) {
  const result = await supportAgent.generate({ prompt: query });
  console.log(result.text);
}
```

## That's It!

See [README.md](./README.md) for complete documentation and [examples.ts](./examples.ts) for more examples.
