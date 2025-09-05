// @ts-nocheck
/**
 * Spatial hierarchy chunking strategy
 */

import { SmartChunk, ChunkMetadata, ChunkingStrategy } from '@/types/chunks';
import { IfcEntity } from '@/types/bim';
import { tokenCounter } from '../utils/token-counter';
import { entityConverter } from '../utils/entity-converter';
import { ChunkLogger } from '../utils/chunk-logger';

interface SpatialNode {
  id: string;
  name?: string;
  type?: string;
  parent?: string;
  children: string[];
  items?: number[];
}

interface EnhancedEntity extends IfcEntity {
  spatialParent?: string;
  localId?: number;
  position?: { x: number; y: number; z: number };
}

export class SpatialHierarchyStrategy implements ChunkingStrategy {
  name = 'spatial-hierarchy';
  type: SmartChunk['type'] = 'spatial';
  
  canProcess(entities: IfcEntity[]): boolean {
    // Check if we have spatial data
    const hasSpatialData = (window as any).__bimData?.spatialHierarchy;
    const hasEnhancedEntities = entities.some((e: any) => e.spatialParent !== undefined);
    
    return hasSpatialData || hasEnhancedEntities;
  }
  
  process(
    entities: IfcEntity[],
    projectId: string,
    options: {
      targetTokenSize: number;
      maxTokenSize: number;
    }
  ): SmartChunk[] {
    const chunks: SmartChunk[] = [];
    const spatialHierarchy = (window as any).__bimData?.spatialHierarchy || {};
    
    ChunkLogger.info('Starting spatial hierarchy chunking', {
      entityCount: entities.length,
      spatialNodes: Object.keys(spatialHierarchy).length
    });
    
    // Group entities by spatial parent
    const entitiesBySpatial = this.groupBySpatialParent(entities as EnhancedEntity[]);
    
    // Process each spatial group
    entitiesBySpatial.forEach((spatialEntities, spatialId) => {
      const spatialNode = spatialHierarchy[spatialId];
      const spatialName = spatialNode?.name || spatialId;
      
      // If group is small enough, create single chunk
      if (this.calculateTokens(spatialEntities) <= options.targetTokenSize) {
        chunks.push(this.createChunk(
          projectId,
          spatialEntities,
          `${spatialName}_all`,
          spatialNode
        ));
      } else {
        // Split large spatial groups by entity type
        const byType = this.groupByType(spatialEntities);
        
        byType.forEach((typeEntities, type) => {
          if (this.calculateTokens(typeEntities) <= options.maxTokenSize) {
            chunks.push(this.createChunk(
              projectId,
              typeEntities,
              `${spatialName}_${type}`,
              spatialNode
            ));
          } else {
            // Further split by size
            const subChunks = this.splitBySize(
              typeEntities, 
              options.targetTokenSize,
              `${spatialName}_${type}`
            );
            chunks.push(...subChunks.map(sc => 
              this.createChunk(projectId, sc.entities, sc.name, spatialNode)
            ));
          }
        });
      }
    });
    
    // Handle entities without spatial parent
    const orphanEntities = entitiesBySpatial.get('no_spatial_parent') || [];
    if (orphanEntities.length > 0) {
      const orphanChunks = this.processOrphanEntities(
        orphanEntities,
        projectId,
        options
      );
      chunks.push(...orphanChunks);
    }
    
    ChunkLogger.info('Spatial hierarchy chunking complete', {
      chunksCreated: chunks.length,
      avgChunkSize: chunks.reduce((sum, c) => sum + c.entities.length, 0) / chunks.length
    });
    
    return chunks;
  }
  
  private groupBySpatialParent(entities: EnhancedEntity[]): Map<string, EnhancedEntity[]> {
    const groups = new Map<string, EnhancedEntity[]>();
    
    entities.forEach(entity => {
      const spatialId = entity.spatialParent || 'no_spatial_parent';
      if (!groups.has(spatialId)) {
        groups.set(spatialId, []);
      }
      groups.get(spatialId)!.push(entity);
    });
    
    return groups;
  }
  
  private groupByType(entities: EnhancedEntity[]): Map<string, EnhancedEntity[]> {
    const groups = new Map<string, EnhancedEntity[]>();
    
    entities.forEach(entity => {
      const type = entity.type || 'Unknown';
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(entity);
    });
    
    return groups;
  }
  
  private splitBySize(
    entities: EnhancedEntity[], 
    targetSize: number,
    baseName: string
  ): { entities: EnhancedEntity[], name: string }[] {
    const results = [];
    let currentChunk: EnhancedEntity[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    
    // Sort by position if available for better spatial coherence
    const sorted = [...entities].sort((a, b) => {
      if (!a.position || !b.position) return 0;
      // Sort by distance from origin
      const distA = Math.sqrt(a.position.x ** 2 + a.position.y ** 2 + a.position.z ** 2);
      const distB = Math.sqrt(b.position.x ** 2 + b.position.y ** 2 + b.position.z ** 2);
      return distA - distB;
    });
    
    sorted.forEach(entity => {
      const entityTokens = tokenCounter.countTokens(JSON.stringify(entity));
      
      if (currentTokens + entityTokens > targetSize && currentChunk.length > 0) {
        results.push({
          entities: currentChunk,
          name: `${baseName}_${chunkIndex}`
        });
        currentChunk = [];
        currentTokens = 0;
        chunkIndex++;
      }
      
      currentChunk.push(entity);
      currentTokens += entityTokens;
    });
    
    if (currentChunk.length > 0) {
      results.push({
        entities: currentChunk,
        name: `${baseName}_${chunkIndex}`
      });
    }
    
    return results;
  }
  
  private processOrphanEntities(
    entities: EnhancedEntity[],
    projectId: string,
    options: ChunkingStrategyOptions
  ): SmartChunk[] {
    const chunks: SmartChunk[] = [];
    
    // Group orphans by type
    const byType = this.groupByType(entities);
    
    byType.forEach((typeEntities, type) => {
      const subChunks = this.splitBySize(
        typeEntities,
        options.targetTokenSize,
        `orphan_${type}`
      );
      
      chunks.push(...subChunks.map(sc => 
        this.createChunk(projectId, sc.entities, sc.name, null)
      ));
    });
    
    return chunks;
  }
  
  private createChunk(
    projectId: string,
    entities: EnhancedEntity[],
    name: string,
    spatialNode: SpatialNode | null
  ): SmartChunk {
    const tokenCount = this.calculateTokens(entities);
    const bounds = this.calculateBounds(entities);
    
    return {
      id: `chunk_${name}_${Date.now()}`,
      projectId,
      entities: entities as IfcEntity[],
      metadata: {
        tokenCount,
        entityCount: entities.length,
        entityTypes: [...new Set(entities.map(e => e.type || 'Unknown'))],
        spatialContext: spatialNode ? {
          id: spatialNode.id,
          name: spatialNode.name,
          type: spatialNode.type,
          parent: spatialNode.parent
        } : undefined,
        spatialBounds: bounds
      },
      relationships: this.findRelatedChunks(entities, spatialNode)
    };
  }
  
  private calculateTokens(entities: EnhancedEntity[]): number {
    const sample = JSON.stringify(entities.slice(0, 5));
    const avgTokensPerEntity = tokenCounter.countTokens(sample) / Math.min(5, entities.length);
    return Math.ceil(avgTokensPerEntity * entities.length);
  }
  
  private calculateBounds(entities: EnhancedEntity[]): any {
    const positions = entities
      .filter(e => e.position)
      .map(e => e.position!);
    
    if (positions.length === 0) return undefined;
    
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const zs = positions.map(p => p.z);
    
    return {
      min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
      max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)]
    };
  }
  
  private findRelatedChunks(entities: EnhancedEntity[], spatialNode: SpatialNode | null): string[] {
    const relationships: string[] = [];
    
    // Add parent spatial chunk
    if (spatialNode?.parent) {
      relationships.push(`spatial_${spatialNode.parent}`);
    }
    
    // Add child spatial chunks
    if (spatialNode?.children) {
      spatialNode.children.forEach(childId => {
        relationships.push(`spatial_${childId}`);
      });
    }
    
    return relationships;
  }
}