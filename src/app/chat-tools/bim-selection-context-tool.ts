/**
 * Selected Entities Chunk Manager
 * Extracts and provides chunk data for selected/highlighted entities
 */

import * as FRAGS from "@thatopen/fragments";
import { Tool } from './tool-registry';
import { EventBus } from '@/core/events/event-bus';
import { EntityChunkData } from '@/types/tools';

// Simple logger function
const chunkLogger = {
  log: (message: string) => console.log(`[ChunkManager] ${message}`),
  error: (message: string, error?: Error) => console.error(`[ChunkManager] ${message}`, error),
  warn: (message: string, error?: any) => console.warn(`[ChunkManager] ${message}`, error)
};


export class SelectedEntitiesChunkManager {
  private static instance: SelectedEntitiesChunkManager;
  // Stores raw expressIds per source so we can decide which set is "active" by recency
  public userHighlightExpressIds: number[] = [];
  public aiHighlightExpressIds: number[] = [];

  // Timestamps per source (ms since epoch) to resolve precedence by most-recent event
  public lastUserHighlightAt = 0;
  public lastAiHighlightAt = 0;
  
  private constructor() {
    // Re-enabling EventBus listeners
    EventBus.on('user:highlight', this.handleUserHighlight.bind(this));
    EventBus.on('ai:highlight', this.handleAiHighlight.bind(this));
    chunkLogger.log("Initialized with EventBus listener");
  }
  
  private handleUserHighlight(data: { expressIds: number[]; globalIds?: string[] }) {
    chunkLogger.log(`User highlight received: ${data.expressIds?.length || 0} entities`);
    this.userHighlightExpressIds = data.expressIds || [];
    this.lastUserHighlightAt = Date.now();
    chunkLogger.log(`Stored user highlight IDs: [${this.userHighlightExpressIds.join(', ')}]`);
  }

  private handleAiHighlight(data: { expressIds: number[]; globalIds?: string[] }) {
    chunkLogger.log(`AI highlight received: ${data.expressIds?.length || 0} entities`);
    this.aiHighlightExpressIds = data.expressIds || [];
    this.lastAiHighlightAt = Date.now();
    chunkLogger.log(`Stored AI highlight IDs: [${this.aiHighlightExpressIds.join(', ')}]`);
  }

  public getActiveExpressIds(): number[] {
    // Choose the most recent non-empty source. If empty, return an empty list
    const candidates: Array<{ ts: number; ids: number[] }> = [
      { ts: this.lastAiHighlightAt, ids: this.aiHighlightExpressIds },
      { ts: this.lastUserHighlightAt, ids: this.userHighlightExpressIds },
    ].filter(c => c.ids && c.ids.length > 0);

    if (candidates.length === 0) return [];
    candidates.sort((a, b) => b.ts - a.ts);
    return candidates[0].ids;
  }

  private mapExpressIdsToChunks(expressIds: number[]): EntityChunkData[] {
    const results: EntityChunkData[] = [];
    if (!expressIds || expressIds.length === 0) return results;

    const bimData = (window as any).__bimData;
    if (!bimData || !Array.isArray(bimData.entities)) {
      chunkLogger.warn('No BIM data available');
      return results;
    }

    for (const expressId of expressIds) {
      // Try both expressID and localId fields since entities might have different naming
      const entity = bimData.entities.find((e: any) => 
        e.expressID === expressId || e.localId === expressId || e.id === expressId
      );
      if (!entity) {
        chunkLogger.warn(`Entity not found for ID: ${expressId}`);
        continue;
      }
      results.push({
        localId: entity.localId || entity.expressID || expressId,
        expressId: entity.expressID || entity.localId || expressId,
        globalId: entity.globalId,
        attributes: entity.properties || entity.attributes || {},
        psets: entity.psets || {},
        category: entity.type || entity.category,
        name: entity.name,
        description: `${entity.type || entity.category || 'Unknown'} (ID: ${expressId})`,
      });
    }
    return results;
  }
  
  static getInstance(): SelectedEntitiesChunkManager {
    if (!SelectedEntitiesChunkManager.instance) {
      SelectedEntitiesChunkManager.instance = new SelectedEntitiesChunkManager();
    }
    return SelectedEntitiesChunkManager.instance;
  }
  
  getSelectedChunks(): EntityChunkData[] {
    const ids = this.getActiveExpressIds();
    return this.mapExpressIdsToChunks(ids);
  }
  
  getChunksAsContext(): string {
    const selected = this.getSelectedChunks();
    if (selected.length === 0) {
      return "No entities selected.";
    }
    
    const context = [
      `Selected Entities (${selected.length}):`,
      ...selected.map(entity => {
        const lines = [
          `\n- Entity ID: ${entity.expressId}`,
          `  Type: ${entity.category || 'Unknown'}`,
          `  Name: ${entity.name || 'Unnamed'}`,
          `  Global ID: ${entity.globalId || 'N/A'}`
        ];
        
        // Add key attributes
        const importantAttrs = ['Material', 'Height', 'Width', 'Length', 'Area', 'Volume'];
        for (const attr of importantAttrs) {
          if (entity.attributes[attr]) {
            lines.push(`  ${attr}: ${entity.attributes[attr]}`);
          }
        }
        
        return lines.join('\n');
      })
    ];
    
    return context.join('\n');
  }
  
  // Simplified method to add entities manually
  addEntity(entity: EntityChunkData) {
    // Treat manual add as user-originated highlight for consistency
    this.userHighlightExpressIds.push(entity.expressId);
    this.lastUserHighlightAt = Date.now();
  }
  
  clearEntities() {
    this.userHighlightExpressIds = [];
    this.aiHighlightExpressIds = [];
    this.lastUserHighlightAt = this.lastAiHighlightAt = 0;
  }
}

// Create and export a tool for the LLM
export const bimSelectionContextTool: Tool = {
  name: 'bim_selection_context',
  description: 'Get detailed information about currently selected/highlighted entities. Use this when the user asks "what is selected" or similar questions about current selection.',
  parameters: {
    type: "object",
    properties: {}
  },
  execute: async () => {
    const manager = SelectedEntitiesChunkManager.getInstance();
    
    // Debug logging
    chunkLogger.log(`Selection tool called - checking active IDs...`);
    const activeIds = manager.getActiveExpressIds();
    chunkLogger.log(`Active IDs: [${activeIds.join(', ')}]`);
    
    const chunks = manager.getSelectedChunks();
    const context = manager.getChunksAsContext();
    
    chunkLogger.log(`Found ${chunks.length} chunks in selection context`);
    
    return {
      success: true,
      message: chunks.length > 0 ? context : "No entities are currently selected.",
      data: {
        chunks: chunks,
        count: chunks.length,
        activeSource: chunks.length > 0 ? 'detected' : 'none',
        debugInfo: {
          userHighlights: manager.userHighlightExpressIds,
          aiHighlights: manager.aiHighlightExpressIds,
          lastUserAt: manager.lastUserHighlightAt,
          lastAiAt: manager.lastAiHighlightAt
        }
      }
    };
  }
};

// Auto-initialize
const manager = SelectedEntitiesChunkManager.getInstance();