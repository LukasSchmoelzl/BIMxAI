// Tool Chain Executor - Orchestrates tool execution based on AI decisions

import { ToolRegistry, ToolCall, ToolChainResult } from './tool-registry';
import ClaudeClient from '@/features/ai/services/claude-client';

// Type moved from tools.ts
export interface ToolChainConfig {
  maxIterations?: number;
  timeout?: number;
  debug?: boolean;
}

export class ToolChainExecutor {
  private registry: ToolRegistry;
  private claudeClient: ClaudeClient;
  private config: ToolChainConfig;

  constructor(
    registry: ToolRegistry,
    claudeClient: ClaudeClient,
    config: ToolChainConfig = {}
  ) {
    this.registry = registry;
    this.claudeClient = claudeClient;
    this.config = {
      maxIterations: 5,
      ...config
    };
  }

  async execute(userPrompt: string, context?: any): Promise<{ toolCalls: Array<{ tool: string; input: any; output: any; duration: number }>; finalAnswer: string; error?: { message: string; code: string } }> {
    const toolCalls: Array<{ tool: string; input: any; output: any; duration: number }> = [];
    let iteration = 0;
    let conversationHistory = '';

    while (iteration < this.config.maxIterations!) {
      iteration++;
      // console.log(`🔄 Tool Chain Iteration ${iteration}`);

      // Step 1: Ask Claude which tools to use
      const toolDecision = await this.getToolDecision(
        userPrompt,
        conversationHistory,
        context
      );

      // Check for errors first
      if (toolDecision.error) {
        return {
          toolCalls,
          finalAnswer: toolDecision.error.message,
          error: toolDecision.error
        };
      }

      if (!toolDecision.toolCalls || toolDecision.toolCalls.length === 0) {
        // No more tools needed, return final answer
        return {
          toolCalls,
          finalAnswer: toolDecision.finalAnswer || 'Aufgabe abgeschlossen.'
        };
      }

      // Step 2: Execute the requested tools
      for (const call of toolDecision.toolCalls) {
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

          // Update conversation history with summarized output
          const summarizedOutput = this.summarizeToolOutput(call.tool, result);
          conversationHistory += `\nTool: ${call.tool}\nInput: ${JSON.stringify(call.parameters)}\nOutput: ${summarizedOutput}\n`;
        } catch (error) {
          console.error(`Tool execution failed: ${call.tool}`, error);
          conversationHistory += `\nTool: ${call.tool} failed with error: ${error}\n`;
        }
      }
    }

    // Max iterations reached
    return {
      toolCalls,
      finalAnswer: 'Maximale Anzahl an Iterationen erreicht. Aufgabe möglicherweise unvollständig.'
    };
  }

  private async getToolDecision(
    userPrompt: string,
    history: string,
    context?: any
  ): Promise<{ toolCalls?: ToolCall[], finalAnswer?: string, error?: { message: string, code: string, status?: number, retry_after?: number } }> {
    const toolDescriptions = this.registry.getToolDescriptions();
    
    // Increased limits for history and context
    const truncatedHistory = history && history.length > 20000 
      ? history.substring(history.length - 20000) + '\n[... frühere Historie gekürzt ...]'
      : history;
    
    // Limit context size but keep it reasonable
    const contextStr = context ? JSON.stringify(context, null, 2) : '';
    const truncatedContext = contextStr.length > 10000 
      ? contextStr.substring(0, 10000) + '\n... [gekürzt]'
      : contextStr;
    
    const prompt = `Du bist ein hilfreicher Assistent mit Zugriff auf folgende Tools:

${toolDescriptions}

Benutzeranfrage: "${userPrompt}"

${truncatedHistory ? `Bisheriger Verlauf:\n${truncatedHistory}` : ''}

${truncatedContext ? `Kontext:\n${truncatedContext}` : ''}

Entscheide, welche Tools als nächstes aufgerufen werden sollen, um die Anfrage zu beantworten.

WICHTIG: Wenn der Benutzer nach Informationen über Entities fragt (z.B. "Zeig Infos", "Zeige Details", "Info über..."), 
MUSST du IMMER zuerst bim_search verwenden, um die Entities zu finden, 
und dann optional bim_highlight um sie hervorzuheben.

Wenn keine weiteren Tools benötigt werden, gib eine finale Antwort.

Antworte im JSON Format:
{
  "thought": "Dein Gedankengang",
  "toolCalls": [
    {
      "tool": "tool_name",
      "parameters": { ... }
    }
  ],
  "finalAnswer": "Finale Antwort wenn fertig"
}

WICHTIG: 
- Antworte NUR mit validem JSON
- Verwende KEINE Kommentare im JSON (keine /* */ oder //)
- Wenn du mehrere Tools aufrufen willst, liste sie alle im toolCalls Array auf
- Setze "finalAnswer" nur wenn du keine weiteren Tools brauchst`;

    try {
      const response = await this.claudeClient.generatePlan(prompt, {});
      
      // Check for error in response
      if (response.error) {
        return {
          error: {
            message: response.error,
            code: 'CLAUDE_API_ERROR'
          }
        };
      }
      
      const content = response.message || '';
      
      // Parse JSON from response with better error handling
      let decision;
      try {
        // First try to parse the entire response as JSON
        decision = JSON.parse(content);
      } catch {
        // If that fails, try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          // If no JSON found, treat as final answer
          return { finalAnswer: content };
        }
        
        try {
          decision = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse JSON from Claude response:', content);
          return { 
            error: { 
              message: 'Claude gab eine ungültige Antwort zurück.',
              code: 'INVALID_JSON_RESPONSE'
            }
          };
        }
      }
      
      if (this.config.includeThoughts && decision.thought) {
        // console.log(`💭 Claude's thought: ${decision.thought}`);
      }

      return decision;
    } catch (error) {
      console.error('Failed to get tool decision:', error);
      
      // Pass through error objects with codes
      if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
        return { error: error as { message: string, code: string, status?: number, retry_after?: number } };
      }
      
      // Fallback for other errors
      return { 
        error: { 
          message: 'Fehler bei der Tool-Entscheidung.',
          code: 'TOOL_DECISION_ERROR'
        }
      };
    }
  }

  private summarizeToolOutput(toolName: string, result: any): string {
    switch (toolName) {
      case 'query_ifc_entities':
        if (result && result.count !== undefined) {
          const expressIds = result.entityIds || result.results?.map((r: any) => r.expressID) || [];
          const limitedIds = expressIds.slice(0, 50); // Increased from 10 to 50
          const entityType = result.results?.[0]?.type || result.examples?.[0]?.type || 'unknown';
          return `{"count": ${result.count}, "entityType": "${entityType}", "expressIds": [${limitedIds.join(', ')}${expressIds.length > 50 ? ', ...' : ''}]}`;
        }
        return JSON.stringify(result).substring(0, 500) + '...'; // Increased from 200 to 500
      
      case 'count_entities':
        if (result && result.count !== undefined) {
          return `{"count": ${result.count}}`;
        }
        return JSON.stringify(result);
      
      case 'highlight_entities':
        if (result && result.highlighted !== undefined) {
          return `{"highlighted": ${result.highlighted}, "expressIds": [${result.expressIds?.slice(0, 3).join(', ')}${result.expressIds?.length > 3 ? '...' : ''}]}`;
        }
        return JSON.stringify(result);
      
      case 'list_entity_types':
        if (result && result.typeCount !== undefined) {
          return `{"typeCount": ${result.typeCount}, "totalEntities": ${result.totalEntities}, "exampleCount": ${result.count}}`;
        }
        return JSON.stringify(result).substring(0, 200) + '...';
      
      default:
        // For other tools, limit the output size
        const resultStr = JSON.stringify(result);
        return resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr;
    }
  }
} 