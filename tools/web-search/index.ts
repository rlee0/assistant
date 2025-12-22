import { z } from 'zod';
import { ToolDefinition } from '@/types/tools';

export const webSearchSettingsSchema = z.object({
  apiKey: z.string().optional(),
  maxResults: z.number().min(1).max(20).default(5),
  enabled: z.boolean().default(true),
});

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for information',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async (params) => {
    // Stub implementation
    console.log('Web search called with:', params);
    return {
      results: [
        {
          title: 'Example Result',
          url: 'https://example.com',
          snippet: 'This is a stub result for web search',
        },
      ],
      query: params.query,
    };
  },
  settingsSchema: webSearchSettingsSchema,
};
