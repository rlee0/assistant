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
    // Stub implementation - in production, use a safe math parser like mathjs
    // DO NOT use eval() as it's a security vulnerability
    try {
      // Simple stub that returns a placeholder
      // In production, replace with: import { evaluate } from 'mathjs'; const result = evaluate(params.expression);
      return {
        expression: params.expression,
        result: 'Calculator tool is a stub. Use a library like mathjs in production.',
        note: 'This is a demonstration stub. Install mathjs for actual calculations.',
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
