import { z } from 'zod';
import { ToolDefinition } from '@/types/tools';

export const calculatorSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  precision: z.number().min(0).max(10).default(2),
});

export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate'),
  }),
  execute: async (params) => {
    try {
      // Simple safe evaluation (in production, use a proper math parser)
      // This is a stub - use a library like mathjs in production
      const result = eval(params.expression);
      return {
        expression: params.expression,
        result,
      };
    } catch (error) {
      return {
        expression: params.expression,
        error: 'Invalid expression',
      };
    }
  },
  settingsSchema: calculatorSettingsSchema,
};
