import { ToolDefinition, RegisteredTool } from '@/types/tools';
import { webSearchTool } from '@/tools/web-search';
import { calculatorTool } from '@/tools/calculator';
import { codeRunnerTool } from '@/tools/code-runner';

// Auto-discovery: Import all tools
const availableTools: ToolDefinition[] = [
  webSearchTool,
  calculatorTool,
  codeRunnerTool,
];

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  constructor() {
    this.registerTools(availableTools);
  }

  private registerTools(tools: ToolDefinition[]) {
    tools.forEach((tool) => {
      this.tools.set(tool.name, {
        definition: tool,
        isEnabled: true,
      });
    });
  }

  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  getEnabledTools(): RegisteredTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.isEnabled);
  }

  enableTool(name: string) {
    const tool = this.tools.get(name);
    if (tool) {
      tool.isEnabled = true;
    }
  }

  disableTool(name: string) {
    const tool = this.tools.get(name);
    if (tool) {
      tool.isEnabled = false;
    }
  }

  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    if (!tool.isEnabled) {
      throw new Error(`Tool "${name}" is disabled`);
    }
    return await tool.definition.execute(params);
  }
}

export const toolRegistry = new ToolRegistry();
