/**
 * Smart Chunks-aware Tool Chain Executor
 * Intercepts tool calls to extract parameters for Smart Chunks context selection
 */

import { ImprovedToolChainExecutor } from './improved-tool-chain-executor';
import { ToolRegistry } from './tool-registry';
import ClaudeClient from '@/features/ai/services/claude-client';
import { ToolChainConfig } from './tool-chain-executor';
import { DirectSelectionParams } from '@/types/chunks';

export class SmartChunksToolChainExecutor extends ImprovedToolChainExecutor {
  private smartChunksProjectId: string | null = null;
  private smartChunksContext: string = '';
  
  constructor(
    registry: ToolRegistry,
    claudeClient: ClaudeClient,
    config: ToolChainConfig = {}
  ) {
    super(registry, claudeClient, config);
  }
  
  setSmartChunksProjectId(projectId: string | null) {
    this.smartChunksProjectId = projectId;
  }
  
  async execute(userPrompt: string, context?: any, chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<{
    toolCalls: any[]
    finalAnswer: string
    iterations: number
    errors: any[]
    smartChunksUsed?: number
  }> {
    // Run normal execution first
    const result = await super.execute(userPrompt, context, chatHistory)

    // If Smart Chunks are enabled and we have a project, try to enrich context based on last tool call
    if (this.smartChunksProjectId && result.toolCalls?.length > 0) {
      const lastTool = result.toolCalls[0]
      const params = this.extractSmartChunksParams({ tool: lastTool.tool, parameters: lastTool.input })

      if (params) {
        const chunksResult = await this.fetchSmartChunksContext(params)
        if (chunksResult) {
          this.smartChunksContext = chunksResult.context
          context = {
            ...context,
            smartChunksContext: chunksResult.context,
            smartChunksChunks: chunksResult.chunks,
          }
        }
      }
    }

    return {
      ...result,
      smartChunksUsed: context?.smartChunksChunks || 0,
    }
  }

  private extractSmartChunksParams(toolCall: { tool: string; parameters: any }): DirectSelectionParams | null {
    const params: any = {}

    switch (toolCall.tool) {
      case 'bim_universal_search':
        if (toolCall.parameters.entityTypes) {
          params.entityTypes = Array.isArray(toolCall.parameters.entityTypes)
            ? toolCall.parameters.entityTypes
            : [toolCall.parameters.entityTypes]
        }
        if (toolCall.parameters.searchQuery) {
          params.keywords = toolCall.parameters.searchQuery.toLowerCase().split(/\s+/)
        }
        params.queryType = toolCall.parameters.countOnly ? 'count' : 'find'
        break

      case 'bim_spatial_geometry_tool':
        if (toolCall.parameters.floor !== undefined) {
          params.floor = toolCall.parameters.floor
        }
        params.queryType = 'spatial'
        break

      case 'bim_entity_detail_tool':
        if (toolCall.parameters.entityIds?.length > 0) {
          return null
        }
        break

      case 'bim_type_list_tool':
        return null

      default:
        if (toolCall.parameters.entityType) {
          params.entityTypes = [toolCall.parameters.entityType]
        }
    }

    return Object.keys(params).length > 0 ? (params as DirectSelectionParams) : null
  }

  private async fetchSmartChunksContext(params: DirectSelectionParams): Promise<{ context: string; chunks: number } | null> {
    try {
      const chunkSystem = (window as any).__smartChunkSystem
      if (!chunkSystem || !this.smartChunksProjectId) {
        console.log('🧩 Smart Chunks system not available')
        return null
      }

      let query = ''
      if ((params as any).keywords && (params as any).keywords.length > 0) {
        query = (params as any).keywords.join(' ')
      } else if (params.entityTypes && params.entityTypes.length > 0) {
        query = `type:${params.entityTypes.join(' OR type:')}`
      } else if (params.queryType) {
        query = params.queryType
      }

      const result = await chunkSystem.getRelevantChunks(this.smartChunksProjectId, query, 8000)

      const contextParts: string[] = []
      result.chunks.forEach((chunk: any) => {
        contextParts.push(`\n[Chunk ${chunk.id}]`)
        contextParts.push(`Entity Types: ${chunk.metadata.entityTypes.join(', ')}`)
        contextParts.push(`Entities (${chunk.metadata.entityCount}):`)
      })

      return {
        context: contextParts.join('\n'),
        chunks: result.chunks.length,
      }
    } catch (error) {
      console.error('Smart Chunks context error:', error)
      return null
    }
  }
}