// Tool Chain Registry - Manages available tools and their execution

// Types moved from tools.ts
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any, context?: any) => Promise<any>;
}

export interface ToolCall {
  name: string;
  parameters: any;
}

export interface ToolChainResult {
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
    // console.log(`🔧 Registered tool: ${tool.name}`);
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getToolDescriptions(): string {
    return this.getTools().map(tool => {
      // Compact parameter representation
      const params = tool.parameters.properties;
      const paramList = Object.entries(params).map(([key, value]: [string, any]) => {
        const required = tool.parameters.required?.includes(key) ? ' (required)' : '';
        return `${key}: ${value.type}${required}`;
      }).join(', ');
      
      return `- ${tool.name}: ${tool.description}\n  Parameters: {${paramList}}`;
    }).join('\n');
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<{ result: unknown; duration: number }> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(params);
      const duration = Date.now() - startTime;
      // console.log(`✅ Tool ${name} executed in ${duration}ms | Input:`, JSON.stringify(params));
      return { result, duration };
    } catch (error) {
      console.error(`❌ Tool ${name} failed:`, error);
      throw error;
    }
  }
} 