/**
 * Query-adaptive chunking strategy that creates chunks based on query patterns
 */

import { SmartChunk, ChunkMetadata, ChunkingStrategy } from '@/types/chunks';
import { IfcEntity } from '@/types/bim';
import { EnhancedIfcEntity } from '@/types/bim';
import { AttributeExtractor } from '../extraction/attribute-extractor';
import { tokenCounter } from '../utils/token-counter';
import { ChunkLogger } from '../utils/chunk-logger';

/**
 * Query pattern for adaptive chunking
 */
export interface QueryPattern {
  id: string;
  name: string;
  frequency: number;
  attributes: string[];
  entityTypes?: string[];
  spatialContext?: boolean;
  systemContext?: boolean;
}

/**
 * Query-adaptive chunking strategy
 */
export class QueryAdaptiveChunkingStrategy implements ChunkingStrategy {
  name = 'query-adaptive';
  type = 'hybrid' as const;
  
  private attributeExtractor = new AttributeExtractor();
  private queryPatterns: QueryPattern[] = [];
  
  constructor(patterns?: QueryPattern[]) {
    this.queryPatterns = patterns || this.getDefaultPatterns();
  }
  
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
      ChunkLogger.info('Query-adaptive chunking started', {
        entityCount: entities.length,
        patterns: this.queryPatterns.length
      });
      
      // Process each query pattern
      for (const pattern of this.queryPatterns) {
        try {
          const patternChunks = await this.processPattern(
            entities,
            pattern,
            projectId,
            options
          );
          chunks.push(...patternChunks);
          
          ChunkLogger.info(`Processed pattern: ${pattern.id}`, {
            chunkCount: patternChunks.length
          });
        } catch (error) {
          ChunkLogger.error(`Failed to process pattern ${pattern.id}`, error);
        }
      }
    } catch (error) {
      ChunkLogger.error('Query-adaptive chunking failed', error);
    }
    
    return chunks;
  }
  
  /**
   * Process entities for a specific query pattern
   */
  private async processPattern(
    entities: IfcEntity[],
    pattern: QueryPattern,
    projectId: string,
    options: { targetTokenSize: number; maxTokenSize: number }
  ): Promise<SmartChunk[]> {
    // Filter entities by pattern criteria
    let relevantEntities = entities;
    
    if (pattern.entityTypes && pattern.entityTypes.length > 0) {
      relevantEntities = entities.filter(e => pattern.entityTypes!.includes(e.type));
    }
    
    if (relevantEntities.length === 0) {
      return [];
    }
    
    // Extract attributes based on pattern
    const enhancedEntities = await this.extractPatternAttributes(
      relevantEntities,
      pattern
    );
    
    // Group entities based on pattern requirements
    const groups = this.groupByPattern(enhancedEntities, pattern);
    
    // Create chunks for each group
    const chunks: SmartChunk[] = [];
    let chunkIndex = 0;
    
    for (const [groupKey, groupEntities] of Object.entries(groups)) {
      const chunk = await this.createPatternChunk(
        groupEntities,
        pattern,
        groupKey,
        projectId,
        chunkIndex++
      );
      
      if (chunk.tokenCount >= 100) { // Minimum viable chunk size
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Extract attributes needed for a pattern
   */
  private async extractPatternAttributes(
    entities: IfcEntity[],
    pattern: QueryPattern
  ): Promise<EnhancedIfcEntity[]> {
    const loadOptions = {
      includeGeometry: pattern.attributes.includes('volume') || 
                       pattern.attributes.includes('area') ||
                       pattern.attributes.includes('dimensions'),
      includeMaterials: pattern.attributes.includes('material') ||
                        pattern.attributes.includes('weight'),
      includeQuantities: pattern.attributes.includes('quantity') ||
                         pattern.attributes.includes('cost'),
      includeRelationships: pattern.spatialContext || pattern.systemContext
    };
    
    return Promise.all(
      entities.map(e => this.attributeExtractor.extractAttributes(e, loadOptions))
    );
  }
  
  /**
   * Group entities based on pattern requirements
   */
  private groupByPattern(
    entities: EnhancedIfcEntity[],
    pattern: QueryPattern
  ): Record<string, EnhancedIfcEntity[]> {
    const groups: Record<string, EnhancedIfcEntity[]> = {};
    
    // Different grouping strategies based on pattern
    if (pattern.id === 'volume-by-material') {
      // Group by material type
      for (const entity of entities) {
        const material = entity.materials?.[0]?.name || 'unknown';
        if (!groups[material]) groups[material] = [];
        groups[material].push(entity);
      }
    } else if (pattern.id === 'spatial-quantities') {
      // Group by spatial location (simplified for MVP)
      // In real implementation, would use spatial relationships
      const spatialGroups = this.groupBySpatialProximity(entities);
      return spatialGroups;
    } else if (pattern.id === 'system-components') {
      // Group by system type
      return this.groupBySystemType(entities);
    } else {
      // Default: single group
      groups['all'] = entities;
    }
    
    return groups;
  }
  
  /**
   * Create a chunk for a pattern group
   */
  private async createPatternChunk(
    entities: EnhancedIfcEntity[],
    pattern: QueryPattern,
    groupKey: string,
    projectId: string,
    index: number
  ): Promise<SmartChunk> {
    const content = this.formatPatternContent(entities, pattern, groupKey);
    const metadata = this.createPatternMetadata(entities, pattern, groupKey);
    
    return {
      id: `${projectId}-adaptive-${pattern.id}-${index}-${Date.now()}`,
      projectId,
      type: 'hybrid',
      content,
      summary: this.createPatternSummary(entities, pattern, groupKey),
      metadata,
      tokenCount: tokenCounter.estimateTokens(content),
      created: new Date(),
      version: 2,
      queryPattern: pattern.id
    };
  }
  
  /**
   * Format content for pattern-based chunk
   */
  private formatPatternContent(
    entities: EnhancedIfcEntity[],
    pattern: QueryPattern,
    groupKey: string
  ): string {
    const parts: string[] = [];
    
    // Pattern-specific formatting
    if (pattern.id === 'volume-by-material') {
      parts.push(`# Material Group: ${groupKey}`);
      parts.push('');
      parts.push(this.formatVolumeByMaterial(entities));
    } else if (pattern.id === 'spatial-quantities') {
      parts.push(`# Spatial Group: ${groupKey}`);
      parts.push('');
      parts.push(this.formatSpatialQuantities(entities));
    } else if (pattern.id === 'cost-analysis') {
      parts.push(`# Cost Analysis`);
      parts.push('');
      parts.push(this.formatCostAnalysis(entities));
    } else {
      // Generic formatting
      parts.push(`# ${pattern.name}`);
      parts.push('');
      parts.push(this.formatGenericPattern(entities, pattern));
    }
    
    return parts.join('\n');
  }
  
  /**
   * Format volume by material pattern
   */
  private formatVolumeByMaterial(entities: EnhancedIfcEntity[]): string {
    const lines: string[] = [];
    
    // Calculate totals
    let totalVolume = 0;
    let totalWeight = 0;
    const typeBreakdown: Record<string, { count: number; volume: number }> = {};
    
    for (const entity of entities) {
      const volume = entity.geometry?.volume || 0;
      totalVolume += volume;
      
      const weight = entity.quantities?.find(q => q.type === 'weight')?.value || 0;
      totalWeight += weight;
      
      if (!typeBreakdown[entity.type]) {
        typeBreakdown[entity.type] = { count: 0, volume: 0 };
      }
      typeBreakdown[entity.type].count++;
      typeBreakdown[entity.type].volume += volume;
    }
    
    lines.push(`Total Volume: ${totalVolume.toFixed(2)} m³`);
    lines.push(`Total Weight: ${(totalWeight / 1000).toFixed(2)} tons`);
    lines.push(`Total Elements: ${entities.length}`);
    lines.push('');
    
    lines.push('## Breakdown by Element Type:');
    Object.entries(typeBreakdown)
      .sort((a, b) => b[1].volume - a[1].volume)
      .forEach(([type, data]) => {
        lines.push(`- ${type}: ${data.count} elements, ${data.volume.toFixed(2)} m³`);
      });
    
    lines.push('');
    lines.push('## Elements:');
    
    entities.forEach(entity => {
      lines.push(`- ${entity.type} [${entity.expressID}]: ${entity.name || 'Unnamed'}`);
      if (entity.geometry?.volume) {
        lines.push(`  Volume: ${entity.geometry.volume.toFixed(3)} m³`);
      }
      const weight = entity.quantities?.find(q => q.type === 'weight');
      if (weight) {
        lines.push(`  Weight: ${weight.value.toFixed(0)} kg`);
      }
    });
    
    return lines.join('\n');
  }
  
  /**
   * Format spatial quantities pattern
   */
  private formatSpatialQuantities(entities: EnhancedIfcEntity[]): string {
    const lines: string[] = [];
    
    // Group by type and calculate quantities
    const typeQuantities: Record<string, {
      count: number;
      totalVolume: number;
      totalArea: number;
      entities: EnhancedIfcEntity[];
    }> = {};
    
    for (const entity of entities) {
      if (!typeQuantities[entity.type]) {
        typeQuantities[entity.type] = {
          count: 0,
          totalVolume: 0,
          totalArea: 0,
          entities: []
        };
      }
      
      const group = typeQuantities[entity.type];
      group.count++;
      group.totalVolume += entity.geometry?.volume || 0;
      group.totalArea += entity.geometry?.area || 0;
      group.entities.push(entity);
    }
    
    lines.push('## Spatial Quantities Summary:');
    lines.push('');
    
    Object.entries(typeQuantities)
      .sort((a, b) => b[1].totalVolume - a[1].totalVolume)
      .forEach(([type, data]) => {
        lines.push(`### ${type}`);
        lines.push(`- Count: ${data.count}`);
        if (data.totalVolume > 0) {
          lines.push(`- Total Volume: ${data.totalVolume.toFixed(2)} m³`);
        }
        if (data.totalArea > 0) {
          lines.push(`- Total Area: ${data.totalArea.toFixed(2)} m²`);
        }
        lines.push('');
      });
    
    return lines.join('\n');
  }
  
  /**
   * Format cost analysis pattern
   */
  private formatCostAnalysis(entities: EnhancedIfcEntity[]): string {
    const lines: string[] = ['## Cost Analysis (Estimated):', ''];
    
    // Simple cost estimation based on material and volume
    const costPerM3: Record<string, number> = {
      'concrete': 150,
      'beton': 150,
      'stahlbeton': 200,
      'steel': 500,
      'stahl': 500,
      'wood': 300,
      'holz': 300,
      'default': 100
    };
    
    let totalCost = 0;
    const costByType: Record<string, number> = {};
    
    for (const entity of entities) {
      const volume = entity.geometry?.volume || 0;
      const material = entity.materials?.[0]?.name?.toLowerCase() || 'default';
      
      let unitCost = costPerM3.default;
      for (const [key, cost] of Object.entries(costPerM3)) {
        if (material.includes(key)) {
          unitCost = cost;
          break;
        }
      }
      
      const cost = volume * unitCost;
      totalCost += cost;
      
      if (!costByType[entity.type]) costByType[entity.type] = 0;
      costByType[entity.type] += cost;
    }
    
    lines.push(`Total Estimated Cost: €${totalCost.toFixed(0)}`);
    lines.push('');
    lines.push('Cost by Element Type:');
    
    Object.entries(costByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, cost]) => {
        lines.push(`- ${type}: €${cost.toFixed(0)}`);
      });
    
    return lines.join('\n');
  }
  
  /**
   * Format generic pattern
   */
  private formatGenericPattern(
    entities: EnhancedIfcEntity[],
    pattern: QueryPattern
  ): string {
    const lines: string[] = [];
    
    // Summary statistics
    lines.push(`Total Elements: ${entities.length}`);
    lines.push('');
    
    // Group by type
    const byType = entities.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    lines.push('Elements by Type:');
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        lines.push(`- ${type}: ${count}`);
      });
    
    return lines.join('\n');
  }
  
  /**
   * Create metadata for pattern chunk
   */
  private createPatternMetadata(
    entities: EnhancedIfcEntity[],
    pattern: QueryPattern,
    groupKey: string
  ): ChunkMetadata {
    const metadata: ChunkMetadata = {
      entityTypes: [...new Set(entities.map(e => e.type))],
      entityCount: entities.length,
      entityIds: entities.map(e => e.expressID).slice(0, 1000),
      queryPattern: pattern.id,
      groupKey
    };
    
    // Add pattern-specific metadata
    if (pattern.attributes.includes('volume')) {
      const totalVolume = entities.reduce((sum, e) => sum + (e.geometry?.volume || 0), 0);
      metadata.aggregates = { totalVolume };
    }
    
    return metadata;
  }
  
  /**
   * Create summary for pattern chunk
   */
  private createPatternSummary(
    entities: EnhancedIfcEntity[],
    pattern: QueryPattern,
    groupKey: string
  ): string {
    return `${pattern.name} - ${groupKey}: ${entities.length} elements`;
  }
  
  /**
   * Group by spatial proximity (simplified)
   */
  private groupBySpatialProximity(entities: EnhancedIfcEntity[]): Record<string, EnhancedIfcEntity[]> {
    // For MVP, use entity ID ranges as proxy for spatial proximity
    const groups: Record<string, EnhancedIfcEntity[]> = {};
    const groupSize = 100; // Group entities with IDs within 100 of each other
    
    for (const entity of entities) {
      const groupId = Math.floor(entity.expressID / groupSize) * groupSize;
      const groupKey = `spatial_group_${groupId}`;
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(entity);
    }
    
    return groups;
  }
  
  /**
   * Group by system type
   */
  private groupBySystemType(entities: EnhancedIfcEntity[]): Record<string, EnhancedIfcEntity[]> {
    const systemPatterns: Record<string, string[]> = {
      'structural': ['WALL', 'SLAB', 'BEAM', 'COLUMN', 'FOUNDATION'],
      'envelope': ['WINDOW', 'DOOR', 'CURTAINWALL', 'ROOF'],
      'interior': ['FURNITURE', 'STAIR', 'RAILING'],
      'mep': ['PIPE', 'DUCT', 'CABLE', 'EQUIPMENT']
    };
    
    const groups: Record<string, EnhancedIfcEntity[]> = {};
    
    for (const entity of entities) {
      let assigned = false;
      
      for (const [system, patterns] of Object.entries(systemPatterns)) {
        if (patterns.some(p => entity.type.includes(p))) {
          if (!groups[system]) groups[system] = [];
          groups[system].push(entity);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        if (!groups['other']) groups['other'] = [];
        groups['other'].push(entity);
      }
    }
    
    return groups;
  }
  
  /**
   * Get default query patterns
   */
  private getDefaultPatterns(): QueryPattern[] {
    return [
      {
        id: 'volume-by-material',
        name: 'Volume Analysis by Material',
        frequency: 100,
        attributes: ['volume', 'material', 'weight'],
        entityTypes: ['IFCWALL', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN']
      },
      {
        id: 'spatial-quantities',
        name: 'Spatial Quantity Analysis',
        frequency: 80,
        attributes: ['volume', 'area', 'count'],
        spatialContext: true
      },
      {
        id: 'cost-analysis',
        name: 'Cost Estimation',
        frequency: 60,
        attributes: ['volume', 'material', 'cost']
      },
      {
        id: 'system-components',
        name: 'System Component Analysis',
        frequency: 50,
        attributes: ['type', 'count', 'connections'],
        systemContext: true
      }
    ];
  }
  
  /**
   * Update query patterns based on usage
   */
  updatePatterns(usageData: { queryIntent: string; attributes: string[] }[]): void {
    // Analyze usage data and update patterns
    // This would be called periodically to optimize chunks based on actual usage
  }
}