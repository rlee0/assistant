# Agent Integration Guide

This guide shows how to integrate the generic agent into the existing chat API route.

## Current Implementation

The current `/api/chat` route uses `streamText` directly:

```typescript
const result = await streamText({
  model: client(resolvedModel),
  messages: augmentedMessages,
  tools,
});
return result.toTextStreamResponse();
```

This works well and is the recommended approach for simple tool usage.

## When to Use the Agent Class

Use the `Agent` class when you need:

1. **Reusable agent configurations** - Define once, use multiple times
2. **Complex multi-step reasoning** - Agent handles the tool loop
3. **Centralized agent definitions** - Separate agents for different purposes
4. **Type-safe agent composition** - Build agents from components

## Integration Example

### Option 1: Replace streamText with Agent (Full Migration)

```typescript
// app/api/chat/route.ts
import { Agent } from "@/lib/agent/agent";
import { createStreamingResponse } from "@/lib/agent/agent";

export async function POST(req: Request) {
  try {
    const bodyResult = await parseRequestBody(req as NextRequest);
    if (bodyResult instanceof NextResponse) {
      return bodyResult;
    }

    const { messages, model: requestModel, context } = validateChatRequest(bodyResult);

    const apiKey =
      process.env.AI_GATEWAY_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.AZURE_OPENAI_API_KEY;

    if (!apiKey) {
      throw new APIError("Missing API key for model provider", 500);
    }

    const resolvedModel =
      requestModel || process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;

    const client = createOpenAI({
      apiKey,
      baseURL: process.env.AI_GATEWAY_URL,
    });

    // Load user tools (same as before)
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    let toolSettings = defaultToolSettings();
    const query = userId
      ? supabase.from("tools").select("id,settings").eq("user_id", userId)
      : supabase.from("tools").select("id,settings");

    const { data: toolsData } = await query;
    if (Array.isArray(toolsData) && toolsData.length > 0) {
      toolSettings = Object.fromEntries(
        toolsData.map((row: Record<string, unknown>) => [row.id, row.settings ?? {}])
      );
    }
    const tools = buildTools(toolSettings);

    // Create agent with tools
    const agent = new Agent({
      model: client(resolvedModel),
      instructions: "You are a helpful AI assistant with access to various tools.",
      tools,
    });

    // Convert messages to prompt
    const lastMessage = messages[messages.length - 1];
    const prompt =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Stream response
    return createStreamingResponse(agent, {
      prompt,
      context,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

### Option 2: Hybrid Approach (Recommended)

Keep the current implementation and add agent support via a query parameter:

```typescript
// app/api/chat/route.ts
import { Agent } from "@/lib/agent/agent";
import { createStreamingResponse } from "@/lib/agent/agent";

export async function POST(req: Request) {
  try {
    const bodyResult = await parseRequestBody(req as NextRequest);
    if (bodyResult instanceof NextResponse) {
      return bodyResult;
    }

    const { messages, model: requestModel, context, useAgent } = validateChatRequest(bodyResult);

    // ... existing setup code ...

    const tools = buildTools(toolSettings);

    // Use agent if requested
    if (useAgent) {
      const agent = new Agent({
        model: client(resolvedModel),
        instructions: "You are a helpful AI assistant.",
        tools,
      });

      const lastMessage = messages[messages.length - 1];
      const prompt =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      return createStreamingResponse(agent, { prompt, context });
    }

    // Otherwise use existing streamText approach
    const augmentedMessages: ModelMessage[] = context
      ? [{ role: "system" as const, content: `Context: ${context}` }, ...messages]
      : messages;

    const result = await streamText({
      model: client(resolvedModel),
      messages: augmentedMessages,
      tools,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return handleAPIError(error);
  }
}
```

### Option 3: Separate Agent Endpoints

Create dedicated agent endpoints for specific use cases:

```typescript
// app/api/agent/assistant/route.ts
import { Agent } from "@/lib/agent/agent";
import { createStreamingResponse } from "@/lib/agent/agent";
import { buildTools, defaultToolSettings } from "@/tools";

// Create a reusable assistant agent
const assistantAgent = new Agent({
  model: openai("gpt-4"),
  instructions: `You are a helpful AI assistant with the following capabilities:
    - Answer questions accurately
    - Use tools when needed
    - Provide clear, concise responses
    - Ask clarifying questions when uncertain`,
  tools: buildTools(defaultToolSettings()),
});

export async function POST(req: Request) {
  const { prompt, context } = await req.json();

  return createStreamingResponse(assistantAgent, {
    prompt,
    context,
  });
}
```

```typescript
// app/api/agent/code-reviewer/route.ts
import { Agent } from "@/lib/agent/agent";
import { createStreamingResponse } from "@/lib/agent/agent";

const codeReviewAgent = new Agent({
  model: openai("gpt-4"),
  instructions: `You are an expert code reviewer. Provide:
    - Security vulnerability analysis
    - Performance optimization suggestions
    - Code quality improvements
    - Best practice recommendations`,
  temperature: 0.3, // Lower for more consistent reviews
});

export async function POST(req: Request) {
  const { code } = await req.json();

  return createStreamingResponse(codeReviewAgent, {
    prompt: `Review this code:\n\n${code}`,
  });
}
```

## Recommendations

1. **Keep Current Implementation**: The existing `streamText` approach is perfect for the chat API. It's simple, direct, and works well.

2. **Use Agent for Specialized Tasks**: Create separate agents for specific use cases like code review, data analysis, or customer support.

3. **Progressive Enhancement**: Add agent support gradually as needed, rather than replacing everything at once.

4. **Tool Agnostic Design**: The agent automatically works with any tools you provide through `buildTools()`.

## Benefits of the Agent Class

- **Reusability**: Define agent configuration once, use everywhere
- **Type Safety**: Full TypeScript support with inference
- **Consistency**: Same behavior across different parts of the app
- **Maintainability**: Centralized agent definitions
- **Testability**: Easy to mock and test

## Migration Path

1. ✅ **Keep current implementation** - It works great
2. Create specialized agent endpoints for specific use cases
3. Gradually adopt agent pattern where it provides value
4. Maintain backward compatibility

The agent is tool-agnostic and follows AI SDK best practices, so it will work with any tools you add in the future.
