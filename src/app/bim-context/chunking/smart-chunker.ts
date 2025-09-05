/**
 * Smart chunker with multiple strategies
 */

import { 
  ChunkingStrategy, 
  ChunkingOptions, 
  ChunkingResult, 
  SmartChunk, 
  ProjectManifest, 
  ChunkMetadata 
} from '@/types/chunks';
import { createDefaultStrategies } from './chunk-strategies';
import { EnhancedElementTypeStrategy } from './dynamic-chunk-strategies';
import { QueryAdaptiveChunkingStrategy } from './query-adaptive-strategy';
import { getMVPConfig } from '../config';
import { tokenCounter } from '../utils/token-counter';
import { entityConverter } from '../utils/entity-converter';
import { IfcEntity, IfcEntityIndex } from '@/types/bim';
import { ChunkLogger } from '../utils/chunk-logger';

export class SmartChunker {
  private strategies: ChunkingStrategy[] = [];
  private config = getMVPConfig();
  
  constructor(options?: Partial<ChunkingOptions>) {
    this.options = {
      targetTokenSize: this.config.tokens.targetChunkSize,
      maxTokenSize: this.config.tokens.maxChunkSize,
      overlapTokens: this.config.tokens.overlapSize,
      includeRelationships: this.config.processing.enableRelationships,
      includeSpatialIndex: this.config.processing.enableSpatialIndex,
      ...options,
    };
    
    // Initialize with default strategies if none provided
    if (this.strategies.length === 0) {
      this.strategies = this.createEnhancedStrategies();
    }
  }
  
  private options: ChunkingOptions;
  
  /**
   * Register a chunking strategy
   */
  registerStrategy(strategy: ChunkingStrategy): void {
    this.strategies.push(strategy);
  }
  
  /**
   * Process IFC model into smart chunks
   */
  async processModel(
    projectId: string,
    modelData: { entities: IfcEntity[]; entityIndex: IfcEntityIndex },
    projectName: string
  ): Promise<ChunkingResult> {
    const startTime = Date.now();
    const allChunks: SmartChunk[] = [];
    const warnings: string[] = [];
    
    try {
      const { entities, entityIndex } = modelData;
      
      if (!entities || entities.length === 0) {
        warnings.push('No entities found in model');
        return this.createEmptyResult(projectId, projectName, startTime, warnings);
      }
      
      ChunkLogger.info('Processing model', { 
        projectId, 
        entityCount: entities.length,
        strategies: this.strategies.length 
      });
      
      // Apply each chunking strategy
      for (const strategy of this.strategies) {
        try {
          if (strategy.canProcess(entities)) {
            ChunkLogger.info(`Running strategy: ${strategy.name}`);
            
            // Handle both sync and async strategies
            const result = strategy.process(
              entities,
              projectId,
              {
                targetTokenSize: this.options.targetTokenSize,
                maxTokenSize: this.options.maxTokenSize,
              }
            );
            
            // Check if result is a Promise
            const strategyChunks = result instanceof Promise ? await result : result;
            
            if (Array.isArray(strategyChunks)) {
              allChunks.push(...strategyChunks);
              ChunkLogger.info(`Strategy ${strategy.name} created chunks`, {
                chunkCount: strategyChunks.length
              });
            }
          }
        } catch (error) {
          const errorMsg = `Strategy ${strategy.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          warnings.push(errorMsg);
          ChunkLogger.error(errorMsg, error);
        }
      }
      
      // If no strategies produced chunks, create a fallback chunk
      if (allChunks.length === 0) {
        const fallbackChunk = this.createFallbackChunk(entities, projectId);
        allChunks.push(fallbackChunk);
      }
      
      // Post-process chunks
      const processedChunks = this.postProcessChunks(allChunks);
      
      // Create inline manifest
      const manifest: ProjectManifest = {
        projectId,
        name: projectName,
        created: new Date(),
        updated: new Date(),
        chunks: processedChunks.map(chunk => ({
          id: chunk.id,
          type: chunk.type,
          tokenCount: chunk.tokenCount,
          entityCount: chunk.metadata.entityCount,
          entityTypes: chunk.metadata.entityTypes,
          created: chunk.created,
          summary: chunk.summary,
          keywords: []
        })),
        totalChunks: processedChunks.length,
        totalTokens: processedChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
        totalEntities: processedChunks.reduce((sum, chunk) => sum + chunk.metadata.entityCount, 0),
        metadata: {
          fileName: projectName,
          fileSize: JSON.stringify(modelData).length,
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        },
        index: {
          byType: {},
          byEntityType: {},
          byFloor: {},
          bySystem: {},
          spatial: {
            chunks: []
          }
        }
      };
      
      const processingTime = Date.now() - startTime;
      
      ChunkLogger.info('Model processing complete', {
        projectId,
        chunkCount: processedChunks.length,
        processingTime,
        warnings: warnings.length
      });
      
      return {
        manifest: manifest!,
        chunks: processedChunks,
        processingTime,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      ChunkLogger.error('Chunking failed', error);
      throw new Error(`Chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create an empty result when no entities found
   */
  private createEmptyResult(
    projectId: string,
    projectName: string,
    startTime: number,
    warnings: string[]
  ): ChunkingResult {
    // Create a minimal manifest without FileStore
    const manifest: ProjectManifest = {
      projectId,
      name: projectName,
      totalChunks: 0,
      totalEntities: 0,
      totalTokens: 0,
      created: new Date(),
      updated: new Date(),
      chunks: [],
      index: {
        byType: {},
        byEntityType: {},
        byFloor: {},
        bySystem: {},
        spatial: {
          chunks: []
        }
      },
      metadata: {
        fileName: projectName,
        fileSize: 0,
        processingTime: Date.now() - startTime,
        version: '1.0.0'
      }
    };
    
    return {
      manifest,
      chunks: [],
      processingTime: Date.now() - startTime,
      warnings,
    };
  }
  
  /**
   * Create a fallback chunk with all entities
   */
  private createFallbackChunk(entities: IfcEntity[], projectId: string): SmartChunk {
    const content = entityConverter.entitiesToText(entities, {
      groupByType: true,
      includeProperties: false,
      maxEntitiesPerType: 50,
    });
    
    const summary = entityConverter.createSummary(entities);
    
    const entityTypes = [...new Set(entities.map(e => e.type))];
    const entityIds = entities.map(e => e.expressID);
    
    const metadata: ChunkMetadata = {
      entityTypes,
      entityCount: entities.length,
      entityIds: entityIds.slice(0, 1000), // Limit to prevent huge metadata
    };
    
    return {
      id: this.generateChunkId(projectId, 'fallback', 0),
      projectId,
      type: 'element-type',
      content,
      summary,
      metadata,
      tokenCount: tokenCounter.estimateTokens(content),
      created: new Date(),
      version: 1,
    };
  }
  
  /**
   * Post-process chunks: deduplicate, validate size, etc.
   */
  private postProcessChunks(chunks: SmartChunk[]): SmartChunk[] {
    const processed: SmartChunk[] = [];
    const seenContent = new Set<string>();
    
    for (const chunk of chunks) {
      // Skip duplicate content
      const contentHash = this.hashContent(chunk.content);
      if (seenContent.has(contentHash)) {
        continue;
      }
      seenContent.add(contentHash);
      
      // Split chunks that are too large
      if (chunk.tokenCount > this.options.maxTokenSize) {
        const splitChunks = this.splitLargeChunk(chunk);
        processed.push(...splitChunks);
      } else {
        processed.push(chunk);
      }
    }
    
    return processed;
  }
  
  /**
   * Split a large chunk into smaller ones
   */
  private splitLargeChunk(chunk: SmartChunk): SmartChunk[] {
    const parts = tokenCounter.splitByTokenLimit(
      chunk.content,
      this.options.targetTokenSize
    );
    
    return parts.map((part, index) => ({
      ...chunk,
      id: `${chunk.id}-split-${index}`,
      content: part,
      tokenCount: tokenCounter.estimateTokens(part),
      summary: `${chunk.summary} (Part ${index + 1}/${parts.length})`,
    }));
  }
  
  /**
   * Simple content hashing for deduplication
   */
  private hashContent(content: string): string {
    // Simple hash for MVP - in production use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Generate unique chunk ID
   */
  private generateChunkId(projectId: string, type: string, index: number): string {
    return `${projectId}-${type}-${index}-${Date.now()}`;
  }
  
  /**
   * Create enhanced strategies with dynamic chunking
   */
  private createEnhancedStrategies(): ChunkingStrategy[] {
    const strategies: ChunkingStrategy[] = [];
    
    // Add original strategies
    strategies.push(...createDefaultStrategies());
    
    // Add enhanced element type strategy with volume support
    strategies.push(new EnhancedElementTypeStrategy());
    
    // Add query-adaptive strategy with default patterns
    strategies.push(new QueryAdaptiveChunkingStrategy());
    
    return strategies;
  }
  
  /**
   * Enable dynamic chunking mode
   */
  enableDynamicChunking(useEnhanced: boolean = true): void {
    if (useEnhanced) {
      this.strategies = this.createEnhancedStrategies();
    } else {
      this.strategies = createDefaultStrategies();
    }
  }
}