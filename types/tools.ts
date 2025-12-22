import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
  settingsSchema?: z.ZodObject<any>;
}

export interface RegisteredTool {
  definition: ToolDefinition;
  isEnabled: boolean;
}
