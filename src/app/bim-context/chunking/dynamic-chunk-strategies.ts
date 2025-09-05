/**
 * Dynamic chunking strategies with full attribute support
 */

import { SmartChunk, ChunkMetadata, ChunkingStrategy } from '@/types/chunks';
import { IfcEntity } from '@/types/bim';
import { EnhancedIfcEntity, AttributeLoadOptions } from '@/types/bim';
import { AttributeExtractor } from '../extraction/attribute-extractor';
import { tokenCounter } from '../utils/token-counter';
import { ChunkLogger } from '../utils/chunk-logger';

/**
 * Enhanced element type strategy with volume and material data
 */
export class EnhancedElementTypeStrategy implements ChunkingStrategy {
  name = 'enhanced-element-type';
  type = 'element-type' as const;
  
  private attributeExtractor = new AttributeExtractor();
  
  canProcess(entities: IfcEntity[]): boolean {
    return entities.length > 0;
  }
  
  async process(
    entities: IfcEntity[],
    projectId: string,
    options: { targetTokenSize: number; maxTokenSize: number }
  ): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    
    try {
      // Group entities by type
      const typeGroups = this.groupByType(entities);
      
      ChunkLogger.info('Enhanced chunking started', {
        entityCount: entities.length,
        typeGroups: Object.keys(typeGroups).length
      });
      
      // Process each type group
      let chunkIndex = 0;
      for (const [entityType, typeEntities] of Object.entries(typeGroups)) {
        if (!typeEntities || typeEntities.length === 0) continue;
        
        try {
          // Extract enhanced attributes for all entities
          const enhancedEntities = await Promise.all(
            typeEntities.map(e => this.attributeExtractor.extractAttributes(e, {
              includeGeometry: true,
              includeMaterials: true,
              includeQuantities: true
            }))
          );
          
          // Create chunks with size limits
          const typeChunks = await this.createEnhancedTypeChunks(
            enhancedEntities,
            entityType,
            projectId,
            options,
            chunkIndex
          );
          
          chunks.push(...typeChunks);
          chunkIndex += typeChunks.length;
          
          ChunkLogger.info(`Processed ${entityType}`, {
            entityCount: typeEntities.length,
            chunkCount: typeChunks.length
          });
        } catch (error) {
          ChunkLogger.error(`Failed to process ${entityType}`, error);
        }
      }
    } catch (error) {
      ChunkLogger.error('Enhanced chunking failed', error);
    }
    
    return chunks;
  }
  
  private groupByType(entities: IfcEntity[]): Record<string, IfcEntity[]> {
    const groups: Record<string, IfcEntity[]> = {};
    
    for (const entity of entities) {
      if (!groups[entity.type]) {
        groups[entity.type] = [];
      }
      groups[entity.type].push(entity);
    }
    
    return groups;
  }
  
  private async createEnhancedTypeChunks(
    entities: EnhancedIfcEntity[],
    entityType: string,
    projectId: string,
    options: { targetTokenSize: number; maxTokenSize: number },
    startIndex: number
  ): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    let currentChunkEntities: EnhancedIfcEntity[] = [];
    let currentTokens = 0;
    let chunkIndex = startIndex;
    
    for (const entity of entities) {
      const entityContent = this.formatEnhancedEntity(entity);
      const entityTokens = tokenCounter.estimateTokens(entityContent);
      
      // Check if adding this entity would exceed target size
      if (currentTokens + entityTokens > options.targetTokenSize && currentChunkEntities.length > 0) {
        // Create chunk with current entities
        const chunk = this.createEnhancedChunk(
          currentChunkEntities,
          entityType,
          projectId,
          chunkIndex++
        );
        chunks.push(chunk);
        
        // Start new chunk
        currentChunkEntities = [entity];
        currentTokens = entityTokens;
      } else {
        currentChunkEntities.push(entity);
        currentTokens += entityTokens;
      }
    }
    
    // Create chunk for remaining entities
    if (currentChunkEntities.length > 0) {
      const chunk = this.createEnhancedChunk(
        currentChunkEntities,
        entityType,
        projectId,
        chunkIndex
      );
      chunks.push(chunk);
    }
    
    return chunks;
  }
  
  private createEnhancedChunk(
    entities: EnhancedIfcEntity[],
    entityType: string,
    projectId: string,
    index: number
  ): SmartChunk {
    const content = this.createEnhancedContent(entityType, entities);
    const metadata = this.createEnhancedMetadata(entities);
    
    return {
      id: `${projectId}-enhanced-${entityType.toLowerCase()}-${index}-${Date.now()}`,
      projectId,
      type: 'element-type',
      content,
      summary: this.createEnhancedSummary(entityType, entities),
      metadata,
      tokenCount: tokenCounter.estimateTokens(content),
      created: new Date(),
      version: 2, // Version 2 indicates enhanced chunks
    };
  }
  
  private createEnhancedContent(entityType: string, entities: EnhancedIfcEntity[]): string {
    const parts: string[] = [
      `# ${entityType} Elements with Full Attributes`,
      '',
      `Total elements: ${entities.length}`,
      ''
    ];
    
    // Add aggregated statistics
    const stats = this.calculateAggregatedStats(entities);
    if (stats.totalVolume || stats.totalArea || stats.totalWeight) {
      parts.push('## Aggregated Data:');
      if (stats.totalVolume) parts.push(`- Total Volume: ${stats.totalVolume.toFixed(2)} m³`);
      if (stats.totalArea) parts.push(`- Total Area: ${stats.totalArea.toFixed(2)} m²`);
      if (stats.totalWeight) parts.push(`- Total Weight: ${stats.totalWeight.toFixed(0)} kg`);
      if (stats.materialBreakdown.length > 0) {
        parts.push('- Materials:');
        stats.materialBreakdown.forEach(mat => {
          parts.push(`  * ${mat.name}: ${mat.volume.toFixed(2)} m³ (${mat.percentage.toFixed(1)}%)`);
        });
      }
      parts.push('');
    }
    
    // Add individual elements
    parts.push('## Elements:');
    entities.forEach(entity => {
      parts.push(this.formatEnhancedEntity(entity));
      parts.push('');
    });
    
    return parts.join('\n');
  }
  
  private formatEnhancedEntity(entity: EnhancedIfcEntity): string {
    const lines: string[] = [];
    
    // Basic info
    lines.push(`### ${entity.type} [ID: ${entity.expressID}]`);
    if (entity.name) lines.push(`Name: ${entity.name}`);
    if (entity.description) lines.push(`Description: ${entity.description}`);
    
    // Geometry
    if (entity.geometry) {
      const geo = entity.geometry;
      const dims: string[] = [];
      if (geo.length) dims.push(`L=${geo.length.toFixed(2)}m`);
      if (geo.width) dims.push(`W=${geo.width.toFixed(2)}m`);
      if (geo.height) dims.push(`H=${geo.height.toFixed(2)}m`);
      if (geo.thickness) dims.push(`T=${geo.thickness.toFixed(3)}m`);
      if (dims.length > 0) lines.push(`Dimensions: ${dims.join(', ')}`);
      
      if (geo.area) lines.push(`Area: ${geo.area.toFixed(2)} m²`);
      if (geo.volume) lines.push(`Volume: ${geo.volume.toFixed(3)} m³`);
    }
    
    // Materials
    if (entity.materials && entity.materials.length > 0) {
      const mat = entity.materials[0];
      lines.push(`Material: ${mat.name}`);
      if (mat.properties?.density) {
        lines.push(`Density: ${mat.properties.density} kg/m³`);
      }
    }
    
    // Quantities
    const weight = entity.quantities?.find(q => q.type === 'weight');
    if (weight) {
      lines.push(`Weight: ${weight.value.toFixed(0)} ${weight.unit}`);
    }
    
    // Properties
    if (entity.properties && Object.keys(entity.properties).length > 0) {
      const relevantProps = Object.entries(entity.properties)
        .filter(([key]) => !['Name', 'Description', 'ObjectType'].includes(key))
        .slice(0, 5);
      
      if (relevantProps.length > 0) {
        lines.push('Properties:');
        relevantProps.forEach(([key, value]) => {
          lines.push(`  - ${key}: ${value}`);
        });
      }
    }
    
    return lines.join('\n');
  }
  
  private createEnhancedMetadata(entities: EnhancedIfcEntity[]): ChunkMetadata {
    const stats = this.calculateAggregatedStats(entities);
    
    return {
      entityTypes: [...new Set(entities.map(e => e.type))],
      entityCount: entities.length,
      entityIds: entities.map(e => e.expressID),
      properties: this.extractCommonProperties(entities),
      aggregates: {
        totalVolume: stats.totalVolume,
        totalArea: stats.totalArea,
        totalWeight: stats.totalWeight,
        volumeByMaterial: stats.materialBreakdown.reduce((acc, mat) => {
          acc[mat.name] = mat.volume;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
  
  private createEnhancedSummary(entityType: string, entities: EnhancedIfcEntity[]): string {
    const stats = this.calculateAggregatedStats(entities);
    const parts = [`${entityType}: ${entities.length} elements`];
    
    if (stats.totalVolume) {
      parts.push(`${stats.totalVolume.toFixed(1)}m³`);
    }
    if (stats.totalWeight) {
      parts.push(`${(stats.totalWeight / 1000).toFixed(1)}t`);
    }
    
    return parts.join(', ');
  }
  
  private calculateAggregatedStats(entities: EnhancedIfcEntity[]) {
    let totalVolume = 0;
    let totalArea = 0;
    let totalWeight = 0;
    const materialVolumes: Record<string, number> = {};
    
    for (const entity of entities) {
      if (entity.geometry?.volume) {
        totalVolume += entity.geometry.volume;
        
        // Track volume by material
        const material = entity.materials?.[0]?.name || 'Unknown';
        materialVolumes[material] = (materialVolumes[material] || 0) + entity.geometry.volume;
      }
      
      if (entity.geometry?.area) {
        totalArea += entity.geometry.area;
      }
      
      const weight = entity.quantities?.find(q => q.type === 'weight');
      if (weight) {
        totalWeight += weight.value;
      }
    }
    
    // Calculate material breakdown
    const materialBreakdown = Object.entries(materialVolumes)
      .map(([name, volume]) => ({
        name,
        volume,
        percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0
      }))
      .sort((a, b) => b.volume - a.volume);
    
    return {
      totalVolume,
      totalArea,
      totalWeight,
      materialBreakdown
    };
  }
  
  private extractCommonProperties(entities: EnhancedIfcEntity[]): string[] {
    const props = new Set<string>();
    
    // Always include these if present
    props.add('Volume');
    props.add('Area');
    props.add('Material');
    props.add('Weight');
    
    // Add other common properties
    const propertyFrequency: Record<string, number> = {};
    for (const entity of entities) {
      if (entity.properties) {
        for (const prop of Object.keys(entity.properties)) {
          propertyFrequency[prop] = (propertyFrequency[prop] || 0) + 1;
        }
      }
    }
    
    // Add properties that appear in at least 50% of entities
    const threshold = entities.length * 0.5;
    Object.entries(propertyFrequency)
      .filter(([_, count]) => count >= threshold)
      .forEach(([prop]) => props.add(prop));
    
    return Array.from(props).sort();
  }
}