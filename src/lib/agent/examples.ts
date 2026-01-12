/**
 * Example: Using the Generic Agent
 *
 * This example demonstrates how to use the generic agent implementation
 * with various configurations and tool sets.
 */

import { Agent, createTextAgent } from "./agent";
import { LanguageModel, Tool, tool } from "ai";

import { z } from "zod";

/**
 * Example 1: Simple text-only agent
 * No tools, just conversation
 */
export async function exampleTextOnlyAgent(model: LanguageModel) {
  const agent = createTextAgent(model, "You are a helpful AI assistant.");

  const result = await agent.generate({
    prompt: "What is the capital of France?",
  });

  console.log(result.text);
  console.log(`Steps taken: ${result.stepCount}`);
}

/**
 * Example 2: Agent with tools
 * Demonstrates tool-calling capabilities
 */
export async function exampleAgentWithTools(model: LanguageModel) {
  const agent = new Agent({
    model,
    instructions: "You are a weather assistant. Help users get weather information.",
    tools: {
      getWeather: tool({
        description: "Get the current weather for a location",
        inputSchema: z.object({
          location: z.string().describe("The city or location"),
        }),
        execute: async ({ location }) => {
          // Simulated weather API call
          return {
            location,
            temperature: 72,
            conditions: "sunny",
            humidity: 45,
          };
        },
      }),
      convertTemperature: tool({
        description: "Convert temperature between Celsius and Fahrenheit",
        inputSchema: z.object({
          value: z.number().describe("Temperature value"),
          from: z.enum(["C", "F"]).describe("Source unit"),
          to: z.enum(["C", "F"]).describe("Target unit"),
        }),
        execute: async ({ value, from, to }) => {
          if (from === to) return value;
          if (from === "F" && to === "C") {
            return Math.round(((value - 32) * 5) / 9);
          }
          return Math.round((value * 9) / 5 + 32);
        },
      }),
    },
  });

  const result = await agent.generate({
    prompt: "What's the weather in New York and convert it to Celsius?",
  });

  console.log(result.text);
  console.log("\nExecution steps:");
  result.steps.forEach((step) => {
    if (step.type === "tool-call") {
      console.log(`- Called ${step.toolName} with:`, step.toolInput);
    } else if (step.type === "tool-result") {
      console.log(`- Result from ${step.toolName}:`, step.toolOutput);
    }
  });
}

/**
 * Example 3: Streaming agent responses
 * Shows how to stream responses in real-time
 */
export async function exampleStreamingAgent(model: LanguageModel) {
  const agent = new Agent({
    model,
    instructions: "You are a storyteller. Tell engaging short stories.",
  });

  const stream = await agent.stream({
    prompt: "Tell me a short story about a robot learning to paint",
    onStart: () => console.log("Starting stream..."),
    onFinish: () => console.log("\nStream complete!"),
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
}

/**
 * Example 4: Agent with custom configuration
 * Demonstrates advanced configuration options
 */
export async function exampleCustomConfiguration(model: LanguageModel) {
  const agent = new Agent({
    model,
    instructions: "You are a code reviewer. Provide constructive feedback.",
    temperature: 0.3, // Lower temperature for more focused responses
    maxTokens: 500,
    toolChoice: "auto", // Let model decide when to use tools
  });

  const result = await agent.generate({
    prompt: "Review this code: function add(a, b) { return a + b; }",
  });

  console.log(result.text);
}

/**
 * Example 5: Agent with context
 * Shows how to provide additional context
 */
export async function exampleWithContext(model: LanguageModel) {
  const agent = new Agent({
    model,
    instructions: "You are a helpful assistant with knowledge of the user's preferences.",
  });

  const result = await agent.generate({
    prompt: "What movie should I watch tonight?",
    context: "User preferences: loves sci-fi, recently watched Inception, dislikes horror",
  });

  console.log(result.text);
}

/**
 * Example 6: Error handling
 * Demonstrates proper error handling
 */
export async function exampleErrorHandling(model: LanguageModel) {
  const agent = new Agent({
    model,
    tools: {
      failingTool: tool({
        description: "A tool that always fails - for demo purposes",
        inputSchema: z.object({ value: z.string() }),
      }),
    },
  });

  try {
    await agent.generate({
      prompt: "Use the failing tool",
    });
  } catch (error) {
    console.error("Agent error:", error);
    // Handle error appropriately
  }
}

/**
 * Example 7: Reusable agent configuration
 * Create an agent once, use it multiple times
 */
export async function exampleReusableAgent(model: LanguageModel) {
  const customerSupportAgent = new Agent({
    model,
    instructions: `You are a customer support agent for TechCorp.
    - Be polite and professional
    - Provide accurate information
    - Escalate complex issues
    - Keep responses concise`,
    tools: {
      checkOrderStatus: tool({
        description: "Check the status of an order",
        inputSchema: z.object({
          orderId: z.string(),
        }),
        execute: async ({ orderId }) => ({
          orderId,
          status: "shipped",
          estimatedDelivery: "2024-01-15",
        }),
      }),
    },
  });

  // Use the same agent for multiple requests
  const queries = [
    "What's the status of order #12345?",
    "When will my order arrive?",
    "I need to return an item",
  ];

  for (const query of queries) {
    const result = await customerSupportAgent.generate({ prompt: query });
    console.log(`Q: ${query}`);
    console.log(`A: ${result.text}\n`);
  }
}

/**
 * Example 8: Dynamic agent with tool-agnostic design
 * Shows how the agent works with any tool set
 */
export function createDynamicAgent(model: LanguageModel, tools: Record<string, Tool>) {
  return new Agent({
    model,
    instructions: "You are a flexible assistant that can use various tools.",
    tools, // Accept any tools
  });
}

// Export all examples
export const examples = {
  textOnlyAgent: exampleTextOnlyAgent,
  agentWithTools: exampleAgentWithTools,
  streamingAgent: exampleStreamingAgent,
  customConfiguration: exampleCustomConfiguration,
  withContext: exampleWithContext,
  errorHandling: exampleErrorHandling,
  reusableAgent: exampleReusableAgent,
  createDynamicAgent,
};
