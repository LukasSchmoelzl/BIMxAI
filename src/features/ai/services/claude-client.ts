// Claude Client Wrapper - Provides generatePlan method for tool-chain-executor

import { ClaudeConfig, ClaudeResponse } from '@/types/claude';

export class ClaudeClient {
  private apiKey: string;
  private model: string;

  constructor(config: ClaudeConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-0';
  }

  async generatePlan(userMessage: string, context?: any, chatHistory?: Array<{role: 'user' | 'assistant', content: string}>): Promise<ClaudeResponse> {
    try {
      // Use the API route instead of direct API calls
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          messages: chatHistory ? [...chatHistory, { role: 'user', content: userMessage }] : undefined,
          context: context || {},
          mode: 'plan'
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.message || data.response || '',
      };
    } catch (error: any) {
      console.error('Claude API error:', error);
      return {
        content: '',
      };
    }
  }

  async formatResponse(userMessage: string, queryResults: any, context?: any): Promise<ClaudeResponse> {
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            ...context,
            queryResults
          },
          mode: 'format'
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.message || data.response || '',
      };
    } catch (error: any) {
      console.error('Claude API error:', error);
      return {
        content: '',
      };
    }
  }
}

export default ClaudeClient;