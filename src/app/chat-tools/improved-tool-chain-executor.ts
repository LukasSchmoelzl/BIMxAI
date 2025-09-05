/**
 * Improved Tool Chain Executor with robust error handling
 */

import { ToolRegistry } from './tool-registry';
import ClaudeClient from '@/features/ai/services/claude-client';
import Ajv from 'ajv';
import { ToolChainConfig } from './tool-chain-executor';
import { ToolDecisionSchema, ToolDecisionResult } from '@/types/tools';

export class ImprovedToolChainExecutor {
  private validator: Ajv;
  private retryCount: Map<string, number> = new Map();
  
  constructor(
    private registry: ToolRegistry,
    private claudeClient: ClaudeClient,
    private config: ToolChainConfig = {}
  ) {
    this.validator = new Ajv({ allErrors: true });
    this.config = {
      maxIterations: 5,
      ...config
    } as any;
  }
  
  async execute(userPrompt: string, context?: any, chatHistory?: Array<{role: 'user' | 'assistant', content: string}>): Promise<{
    toolCalls: Array<{ tool: string; input: Record<string, unknown>; output: unknown; duration: number }>;
    finalAnswer: string;
    iterations: number;
    errors: any[];
  }> {
    const toolCalls: Array<{ tool: string; input: Record<string, unknown>; output: unknown; duration: number }> = [];
    const errors: any[] = [];
    let iterations = 0;
    let finalAnswer = '';
    let history = '';
    
    while (iterations < (this.config.maxIterations || 5)) {
      iterations++;
      
      try {
        const decision = await this.getToolDecision(userPrompt, history, context, chatHistory);
        
        if (decision.error) {
          errors.push(decision.error);
          break;
        }
        
        if (!decision.toolCalls || decision.toolCalls.length === 0) {
          finalAnswer = decision.finalAnswer || finalAnswer || 'Error: Keine Antwort';
          break;
        }
        
        // Execute requested tools
        for (const call of decision.toolCalls) {
          try {
            const { result, duration } = await this.registry.executeTool(
              call.tool,
              call.parameters
            );
            
            toolCalls.push({
              tool: call.tool,
              input: call.parameters,
              output: result,
              duration
            });
            
            const summarizedOutput = this.summarizeToolOutput(call.tool, result);
            history += `\nTool: ${call.tool}\nInput: ${JSON.stringify(call.parameters)}\nOutput: ${summarizedOutput}\n`;
          } catch (error) {
            console.error(`Tool execution failed: ${call.tool}`, error);
            history += `\nTool: ${call.tool} failed with error: ${error}\n`;
          }
        }
      } catch (err) {
        errors.push(err);
        break;
      }
    }

    return { toolCalls, finalAnswer, iterations, errors };
  }

  private async getToolDecision(
    userPrompt: string,
    history: string,
    context?: any,
    chatHistory?: Array<{role: 'user' | 'assistant', content: string}>
  ): Promise<ToolDecisionResult> {
    const toolDescriptions = this.registry.getToolDescriptions();
    
    const truncatedHistory = history && history.length > 20000 
      ? history.substring(history.length - 20000) + '\n[... frühere Historie gekürzt ...]'
      : history;
    
    const contextStr = context ? JSON.stringify(context, null, 2) : '';
    const truncatedContext = contextStr.length > 10000 
      ? contextStr.substring(0, 10000) + '\n... [gekürzt]'
      : contextStr;
    
    const prompt = `Du bist ein hilfreicher Assistent mit Zugriff auf folgende Tools:

${toolDescriptions}

Benutzeranfrage: "${userPrompt}"

Bisherige Tool-Historie (gekürzt):
${truncatedHistory}

Kontext (gekürzt):
${truncatedContext}

Wenn Tools nötig sind, antworte mit JSON nach diesem Schema:
${JSON.stringify({ thought: 'kurze Begründung', toolCalls: [{ tool: 'tool_name', parameters: { key: 'value' } }] }, null, 2)}

Wenn keine Tools nötig sind, antworte mit JSON:
${JSON.stringify({ finalAnswer: 'Antworttext' }, null, 2)}
`;

    const response = await this.claudeClient.generatePlan(prompt, {}, chatHistory);
    let json: ToolDecisionResult;

    try {
      json = JSON.parse(response.content);
    } catch (error) {
      return {
        error: {
          message: 'Invalid JSON from model',
          code: 'INVALID_JSON',
          details: response.content,
          retry: true
        }
      } as any;
    }

    return json;
  }

  private summarizeToolOutput(tool: string, output: unknown): string {
    try {
      if (typeof output === 'string') return output.slice(0, 300);
      return JSON.stringify(output).slice(0, 300);
    } catch {
      return '[unserializable output]';
    }
  }
}