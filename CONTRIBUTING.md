# Contributing to AI Assistant

Thank you for your interest in contributing to AI Assistant! This guide will help you get started.

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and configure your environment variables
4. Run development server: `npm run dev`
5. Build: `npm run build`
6. Lint: `npm run lint`

## Adding New Tools

Tools are self-contained modules that extend the assistant's capabilities. Follow these steps to add a new tool:

### 1. Create Tool Directory

Create a new directory under `tools/`:
```bash
mkdir tools/my-new-tool
```

### 2. Create Tool Definition

Create `tools/my-new-tool/index.ts`:

```typescript
import { z } from 'zod';
import { ToolDefinition } from '@/types/tools';

// Define settings schema for your tool
export const myNewToolSettingsSchema = z.object({
  apiKey: z.string().optional(),
  enabled: z.boolean().default(true),
  // Add your custom settings here
  maxResults: z.number().min(1).max(100).default(10),
});

// Define the tool
export const myNewTool: ToolDefinition = {
  name: 'my_new_tool',
  description: 'A brief description of what this tool does',
  
  // Define input parameters
  parameters: z.object({
    query: z.string().describe('The query parameter'),
    // Add more parameters as needed
  }),
  
  // Implement the tool logic
  execute: async (params) => {
    // Your tool implementation here
    // Access settings from context if needed
    return {
      result: 'Your result',
      data: {},
    };
  },
  
  // Optional: settings schema for user configuration
  settingsSchema: myNewToolSettingsSchema,
};
```

### 3. Register the Tool

Add your tool to `lib/ai/tool-registry.ts`:

```typescript
import { myNewTool } from '@/tools/my-new-tool';

const availableTools: ToolDefinition[] = [
  webSearchTool,
  calculatorTool,
  codeRunnerTool,
  myNewTool, // Add your tool here
];
```

### 4. Test Your Tool

Your tool is now automatically:
- Available in the tool registry
- Discoverable by the AI agent
- Configurable in the settings UI (if settingsSchema is provided)

## Tool Guidelines

### Best Practices

1. **Self-Contained**: Keep all tool logic within its directory
2. **Settings Schema**: Define a Zod schema for user-configurable settings
3. **Error Handling**: Handle errors gracefully and return meaningful error messages
4. **Documentation**: Add comments explaining complex logic
5. **Type Safety**: Use TypeScript types for all parameters and return values

### Settings Schema Guidelines

```typescript
export const toolSettingsSchema = z.object({
  // API keys (if your tool needs external services)
  apiKey: z.string().optional(),
  
  // Enable/disable flag
  enabled: z.boolean().default(true),
  
  // Tool-specific configuration
  config: z.object({
    timeout: z.number().min(1000).max(30000).default(5000),
    // Add more config as needed
  }).optional(),
});
```

### Parameter Schema Guidelines

Use descriptive types and descriptions:

```typescript
parameters: z.object({
  query: z.string()
    .min(1)
    .max(500)
    .describe('The search query'),
  
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum number of results'),
    
  filters: z.array(z.string())
    .optional()
    .describe('Optional filters to apply'),
})
```

### Execute Function Guidelines

```typescript
execute: async (params) => {
  try {
    // 1. Validate and prepare inputs
    const { query, limit } = params;
    
    // 2. Perform tool operation
    const result = await performOperation(query);
    
    // 3. Return structured response
    return {
      success: true,
      data: result,
      metadata: {
        count: result.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    // 4. Handle errors gracefully
    return {
      success: false,
      error: error.message,
    };
  }
}
```

## Examples

### Simple Tool (No External API)

```typescript
export const timestampTool: ToolDefinition = {
  name: 'timestamp',
  description: 'Get current timestamp',
  parameters: z.object({
    format: z.enum(['iso', 'unix']).default('iso'),
  }),
  execute: async ({ format }) => {
    const now = new Date();
    return {
      timestamp: format === 'iso' ? now.toISOString() : now.getTime(),
    };
  },
};
```

### Tool with External API

```typescript
export const weatherTool: ToolDefinition = {
  name: 'weather',
  description: 'Get weather information',
  parameters: z.object({
    city: z.string().describe('City name'),
  }),
  execute: async ({ city }) => {
    const apiKey = process.env.WEATHER_API_KEY;
    const response = await fetch(
      `https://api.weather.com/v1/current?city=${city}&apiKey=${apiKey}`
    );
    const data = await response.json();
    return {
      city,
      temperature: data.temperature,
      conditions: data.conditions,
    };
  },
  settingsSchema: z.object({
    apiKey: z.string().optional(),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
};
```

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic

## Submitting Changes

1. Create a new branch: `git checkout -b feature/my-new-tool`
2. Make your changes
3. Test your changes: `npm run build && npm run lint`
4. Commit with clear message: `git commit -m "Add weather tool"`
5. Push to GitHub: `git push origin feature/my-new-tool`
6. Create a Pull Request

## Questions?

If you have questions about contributing, please open an issue on GitHub.
