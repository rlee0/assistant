import { z } from 'zod';
import { ToolDefinition } from '@/types/tools';

export const codeRunnerSettingsSchema = z.object({
  apiKey: z.string().optional(),
  enabled: z.boolean().default(true),
  allowedLanguages: z.array(z.string()).default(['javascript', 'python', 'typescript']),
});

export const codeRunnerTool: ToolDefinition = {
  name: 'code_runner',
  description: 'Execute code in a sandboxed environment',
  parameters: z.object({
    language: z.enum(['javascript', 'python', 'typescript']).describe('Programming language'),
    code: z.string().describe('The code to execute'),
  }),
  execute: async (params) => {
    // Stub implementation
    console.log('Code runner called with:', params);
    return {
      language: params.language,
      code: params.code,
      output: 'Stub: Code execution not implemented',
      status: 'success',
    };
  },
  settingsSchema: codeRunnerSettingsSchema,
};
