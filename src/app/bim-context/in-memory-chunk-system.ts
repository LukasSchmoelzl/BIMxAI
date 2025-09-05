/**
 * In-Memory Smart Chunks System
 * No file storage, everything stays in memory for the session
 */

import { SmartChunker } from './chunking/smart-chunker';
import { ContextAssembler } from './selection/context-assembler';
import { QueryAnalyzer } from './selection/query-analyzer';
import { tokenCounter } from './utils/token-counter';
import { IfcEntity, IfcEntityIndex } from '@/types/bim';
import { SmartChunk } from '@/types/chunks';
import { LRUCache } from '@/core/chunks/lru-cache';
import { EventBus } from '@/core/events/event-bus';

interface ChunkMetadata {
  id: string;
  tokenCount: number;
  entityCount: number;
  entityTypes: string[];
  spatialContext?: any;
}

export class InMemoryChunkSystem {
  private chunks = new Map<string, SmartChunk>();
  private chunkMetadata = new Map<string, ChunkMetadata>();
  private projectChunks = new Map<string, string[]>(); // projectId -> chunkIds
  private activeCache: LRUCache<string, SmartChunk>;
  private smartChunker: SmartChunker;
  private contextAssembler: ContextAssembler;
  private queryAnalyzer: QueryAnalyzer;
  
  constructor(maxCacheSize: number = 50) {
    this.activeCache = new LRUCache<string, SmartChunk>({ maxSize: maxCacheSize });
    this.smartChunker = new SmartChunker({
      targetTokenSize: 3000,
      maxTokenSize: 4000,
      overlapTokens: 200
    });
    this.contextAssembler = new ContextAssembler();
    this.queryAnalyzer = new QueryAnalyzer();
    
    console.log('🧩 In-Memory Smart Chunks System initialized');
  }
  
  /**
   * Process entities into chunks (in-memory only)
   */
  async processEntities(
    projectId: string,
    entities: IfcEntity[],
    entityIndex: IfcEntityIndex,
    spatialHierarchy?: any
  ): Promise<{
    success: boolean;
    chunkCount: number;
    totalTokens: number;
    chunks: SmartChunk[];
  }> {
    console.log(`🧩 Processing ${entities.length} entities for project ${projectId}`);
    
    try {
      // Use Smart Chunker to create chunks
      const result = await this.smartChunker.processModel(
        projectId,
        { entities, entityIndex },
        projectId
      );
      
      // Store chunks in memory
      const chunkIds: string[] = [];
      let totalTokens = 0;
      
      (result.chunks || []).forEach(chunk => {
        this.chunks.set(chunk.id, chunk);
        this.activeCache.set(chunk.id, chunk);
        chunkIds.push(chunk.id);
        
        // Store metadata separately for quick access
        const metadata: ChunkMetadata = {
          id: chunk.id,
          tokenCount: chunk.tokenCount,
          entityCount: chunk.metadata.entityCount,
          entityTypes: chunk.metadata.entityTypes,
          spatialContext: (chunk.metadata as any).spatialContext
        };
        this.chunkMetadata.set(chunk.id, metadata);
        totalTokens += chunk.tokenCount;
      });
      
      // Map project to its chunks
      this.projectChunks.set(projectId, chunkIds);
      
      // Emit event
      EventBus.emit('smartchunks:ready', {
        projectId,
        totalChunks: result.chunks.length,
        totalEntities: entities.length,
      });
      
      console.log(`✅ Created ${result.chunks.length} chunks with ${totalTokens} total tokens`);
      
      return {
        success: true,
        chunkCount: result.chunks.length,
        totalTokens,
        chunks: result.chunks
      };
      
    } catch (error) {
      console.error('❌ Failed to process entities:', error);
      return {
        success: false,
        chunkCount: 0,
        totalTokens: 0,
        chunks: []
      };
    }
  }
  
  /**
   * Get chunks relevant to a query
   */
  async getRelevantChunks(
    projectId: string,
    query: string,
    maxTokens: number = 10000
  ): Promise<{
    chunks: SmartChunk[];
    totalTokens: number;
    relevanceScores: Map<string, number>;
  }> {
    console.log(`🔍 Finding relevant chunks for query: "${query}"`);
    
    const projectChunkIds = this.projectChunks.get(projectId) || [];
    if (projectChunkIds.length === 0) {
      return { chunks: [], totalTokens: 0, relevanceScores: new Map() };
    }
    
    // Analyze query intent
    const intent = await this.queryAnalyzer.analyzeIntent(query);
    console.log('📊 Query intent:', intent);
    
    // Get all project chunks
    const projectChunks: SmartChunk[] = [];
    projectChunkIds.forEach(id => {
      const chunk = this.getChunk(id);
      if (chunk) projectChunks.push(chunk);
    });
    
    // Use context assembler to select relevant chunks
      const context = this.contextAssembler.assembleContext(
        projectChunks,
        intent,
        { maxTokens, reservedForSystem: 0, availableForContext: maxTokens, strategy: 'balanced' }
      );
      
      return {
        chunks: projectChunks,
        totalTokens: context.metadata.totalTokens,
        relevanceScores: new Map()
      };
  }
  
  /**
   * Get a specific chunk
   */
  getChunk(chunkId: string): SmartChunk | undefined {
    // Try cache first
    const cached = this.activeCache.get(chunkId);
    if (cached) return cached;
    
    // Get from main storage
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      // Add back to cache
      this.activeCache.set(chunkId, chunk);
    }
    
    return chunk;
  }
  
  /**
   * Get all chunks for a project
   */
  getProjectChunks(projectId: string): SmartChunk[] {
    const chunkIds = this.projectChunks.get(projectId) || [];
    return chunkIds
      .map(id => this.getChunk(id))
      .filter((chunk): chunk is SmartChunk => chunk !== undefined);
  }
  
  /**
   * Get chunk metadata without loading full chunk
   */
  getChunkMetadata(chunkId: string): ChunkMetadata | undefined {
    return this.chunkMetadata.get(chunkId);
  }
  
  /**
   * Get system statistics
   */
  getStats() {
    const projects = Array.from(this.projectChunks.keys());
    let totalChunks = 0;
    let totalEntities = 0;
    let totalTokens = 0;
    
    this.chunkMetadata.forEach(metadata => {
      totalChunks++;
      totalEntities += metadata.entityCount;
      totalTokens += metadata.tokenCount;
    });
    
    return {
      projectCount: projects.length,
      totalChunks,
      loadedChunks: this.chunks.size,
      cachedChunks: this.activeCache.size,
      totalEntities,
      totalTokens,
      averageChunkSize: totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0,
      cacheHitRate: this.activeCache.getStats().hitRate,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Clear chunks for a project
   */
  clearProject(projectId: string) {
    const chunkIds = this.projectChunks.get(projectId) || [];
    
    chunkIds.forEach(id => {
      this.chunks.delete(id);
      this.chunkMetadata.delete(id);
      this.activeCache.delete(id);
    });
    
    this.projectChunks.delete(projectId);
    
    console.log(`🗑️ Cleared ${chunkIds.length} chunks for project ${projectId}`);
  }
  
  /**
   * Clear all data
   */
  clearAll() {
    this.chunks.clear();
    this.chunkMetadata.clear();
    this.projectChunks.clear();
    this.activeCache.clear();
    
    console.log('🗑️ Cleared all chunks from memory');
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation: average 1KB per entity
    let totalEntities = 0;
    this.chunkMetadata.forEach(metadata => {
      totalEntities += metadata.entityCount;
    });
    
    // Return in MB
    return Math.round((totalEntities * 1024) / (1024 * 1024));
  }
}

// Global singleton instance
export const inMemoryChunkSystem = new InMemoryChunkSystem();