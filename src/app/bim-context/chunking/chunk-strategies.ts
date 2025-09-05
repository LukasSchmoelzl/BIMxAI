/**
 * Chunking strategies for different aspects of IFC models
 */

import { SmartChunk, ChunkMetadata, ChunkingStrategy } from '@/types/chunks';
import { IfcEntity } from '@/types/bim';
import { tokenCounter } from '../utils/token-counter';
import { entityConverter } from '../utils/entity-converter';

/**
 * Spatial chunking strategy - groups by location
 */
export class SpatialChunkingStrategy implements ChunkingStrategy {
  name = 'spatial';
  type = 'spatial' as const;
  
  canProcess(entities: IfcEntity[]): boolean {
    // For MVP, we'll use entity types to infer spatial elements
    const spatialTypes = ['IFCBUILDINGSTOREY', 'IFCSPACE', 'IFCZONE', 'IFCSITE', 'IFCBUILDING'];
    return entities.some(e => spatialTypes.includes(e.type));
  }
  
  process(
    entities: IfcEntity[],
    projectId: string,
    options: { targetTokenSize: number; maxTokenSize: number }
  ): SmartChunk[] {
    const chunks: SmartChunk[] = [];
    
    // Group entities by their spatial context
    const spatialGroups = this.groupBySpatialContext(entities);
    
    // Create chunks for each spatial group
    let chunkIndex = 0;
    for (const [context, groupEntities] of Object.entries(spatialGroups)) {
      const content = entityConverter.entitiesToText(groupEntities, {
        groupByType: true,
        includeProperties: true,
        maxEntitiesPerType: 100,
      });
      
      const tokenCount = tokenCounter.estimateTokens(content);
      
      // Skip if too few entities or tokens
      if (groupEntities.length < 5 || tokenCount < 100) {
        continue;
      }
      
      const metadata: ChunkMetadata = {
        entityTypes: [...new Set(groupEntities.map(e => e.type))],
        entityCount: groupEntities.length,
        entityIds: groupEntities.map(e => e.expressID).slice(0, 1000),
        zone: context,
      };
      
      const chunk: SmartChunk = {
        id: `${projectId}-spatial-${chunkIndex++}-${Date.now()}`,
        projectId,
        type: 'spatial',
        content,
        summary: `Spatial group: ${context} with ${groupEntities.length} entities`,
        metadata,
        tokenCount,
        created: new Date(),
        version: 1,
      };
      
      chunks.push(chunk);
    }
    
    return chunks;
  }
  
  private groupBySpatialContext(entities: IfcEntity[]): Record<string, IfcEntity[]> {
    const groups: Record<string, IfcEntity[]> = {};
    
    // Find all building storeys
    const storeys = entities.filter(e => e.type === 'IFCBUILDINGSTOREY');
    
    // If we have storeys, group by them
    if (storeys.length > 0) {
      for (const storey of storeys) {
        const groupName = storey.name || `Floor_${storey.expressID}`;
        groups[groupName] = entities.filter(e => 
          // Simple heuristic: entities with similar IDs might be on same floor
          Math.abs(e.expressID - storey.expressID) < 1000
        );
      }
    } else {
      // Fallback: group by zones or spaces
      const spaces = entities.filter(e => e.type === 'IFCSPACE' || e.type === 'IFCZONE');
      
      if (spaces.length > 0) {
        for (const space of spaces) {
          const groupName = space.name || `Space_${space.expressID}`;
          groups[groupName] = entities.filter(e => 
            Math.abs(e.expressID - space.expressID) < 500
          );
        }
      } else {
        // Last fallback: create arbitrary spatial groups
        groups['General'] = entities;
      }
    }
    
    return groups;
  }
}

/**
 * System-based chunking strategy - groups by building systems
 */
export class SystemChunkingStrategy implements ChunkingStrategy {
  name = 'system';
  type = 'system' as const;
  
  private readonly systemPatterns: Record<string, string[]> = {
    hvac: [
      'IFCAIRTERMININAL', 'IFCAIRTERMINALBOX', 'IFCCOIL', 'IFCDAMPER',
      'IFCDUCT', 'IFCDUCTSEGMENT', 'IFCFAN', 'IFCFILTER',
      'IFCHEATEXCHANGER', 'IFCHUMIDIFIER', 'IFCPIPESEGMENT', 'IFCPUMP',
      'IFCVALVE', 'IFCBOILER', 'IFCCHILLER', 'IFCCOOLINGTOWER'
    ],
    electrical: [
      'IFCCABLECARRIERFITTING', 'IFCCABLECARRIERSEGMENT', 'IFCCABLESEGMENT',
      'IFCELECTRICAPPLIANCE', 'IFCELECTRICDISTRIBUTIONBOARD', 'IFCELECTRICFLOWSTORAGEDEVICE',
      'IFCELECTRICGENERATOR', 'IFCELECTRICMOTOR', 'IFCLAMP', 'IFCLIGHTFIXTURE',
      'IFCMOTORCONNECTION', 'IFCOUTLET', 'IFCSWITCHINGDEVICE', 'IFCTRANSFORMER'
    ],
    plumbing: [
      'IFCPIPESEGMENT', 'IFCPIPEFITTING', 'IFCFLOWMETER', 'IFCPUMP',
      'IFCSANITARYTERMINAL', 'IFCTANK', 'IFCVALVE', 'IFCWASTETERMINAL',
      'IFCFIRESUPPRESSIONTERMINAL', 'IFCINTERCEPTOR'
    ],
    structural: [
      'IFCBEAM', 'IFCCOLUMN', 'IFCFOOTING', 'IFCMEMBER', 'IFCPILE',
      'IFCPLATE', 'IFCRAILING', 'IFCRAMP', 'IFCRAMPFLIGHT', 'IFCREINFORCINGELEMENT',
      'IFCSLAB', 'IFCSTAIR', 'IFCSTAIRFLIGHT', 'IFCWALL', 'IFCWALLSTANDARDCASE'
    ]
  };
  
  canProcess(entities: IfcEntity[]): boolean {
    // Check if entities contain system-related types
    const allSystemTypes = Object.values(this.systemPatterns).flat();
    return entities.some(e => allSystemTypes.includes(e.type));
  }
  
  process(
    entities: IfcEntity[],
    projectId: string,
    options: { targetTokenSize: number; maxTokenSize: number }
  ): SmartChunk[] {
    const chunks: SmartChunk[] = [];
    
    // Group entities by system
    const systemGroups = this.groupBySystem(entities);
    
    // Create chunks for each system
    let chunkIndex = 0;
    for (const [system, systemEntities] of Object.entries(systemGroups)) {
      if (systemEntities.length === 0) continue;
      
      const content = this.createSystemContent(system, systemEntities);
      const tokenCount = tokenCounter.estimateTokens(content);
      
      // Skip if too few entities
      if (systemEntities.length < 3 || tokenCount < 50) {
        continue;
      }
      
      const metadata: ChunkMetadata = {
        entityTypes: [...new Set(systemEntities.map(e => e.type))],
        entityCount: systemEntities.length,
        entityIds: systemEntities.map(e => e.expressID).slice(0, 1000),
        system,
      };
      
      const chunk: SmartChunk = {
        id: `${projectId}-system-${chunkIndex++}-${Date.now()}`,
        projectId,
        type: 'system',
        content,
        summary: this.createSystemSummary(system, systemEntities),
        metadata,
        tokenCount,
        created: new Date(),
        version: 1,
      };
      
      chunks.push(chunk);
    }
    
    return chunks;
  }
  
  private groupBySystem(entities: IfcEntity[]): Record<string, IfcEntity[]> {
    const groups: Record<string, IfcEntity[]> = {
      hvac: [],
      electrical: [],
      plumbing: [],
      structural: [],
      other: []
    };
    
    for (const entity of entities) {
      let assigned = false;
      
      for (const [system, types] of Object.entries(this.systemPatterns)) {
        if (types.includes(entity.type)) {
          groups[system].push(entity);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        // Check if it's a distribution element
        if (entity.type.includes('DISTRIBUTION') || entity.type.includes('FLOW')) {
          groups.other.push(entity);
        }
      }
    }
    
    return groups;
  }
  
  private createSystemContent(system: string, entities: IfcEntity[]): string {
    const parts: string[] = [
      `# ${system.toUpperCase()} System Components`,
      '',
      entityConverter.createSummary(entities),
      '',
      '## Components:',
      entityConverter.entitiesToText(entities, {
        groupByType: true,
        includeProperties: true,
        maxEntitiesPerType: 50,
      })
    ];
    
    return parts.join('\n');
  }
  
  private createSystemSummary(system: string, entities: IfcEntity[]): string {
    const typeCounts = entities.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type} (${count})`);
    
    return `${system.toUpperCase()} system with ${entities.length} components: ${topTypes.join(', ')}`;
  }
}

/**
 * Element type chunking strategy - groups by IFC types
 */
export class ElementTypeChunkingStrategy implements ChunkingStrategy {
  name = 'element-type';
  type = 'element-type' as const;
  
  canProcess(entities: IfcEntity[]): boolean {
    return entities.length > 0;
  }
  
  process(
    entities: IfcEntity[],
    projectId: string,
    options: { targetTokenSize: number; maxTokenSize: number }
  ): SmartChunk[] {
    const chunks: SmartChunk[] = [];
    
    // Group entities by type
    const typeGroups = this.groupByType(entities);
    
    // Create chunks for each type group
    let chunkIndex = 0;
    for (const [entityType, typeEntities] of Object.entries(typeGroups)) {
      // Calculate content size
      let currentChunkEntities: IfcEntity[] = [];
      let currentTokens = 0;
      
      for (const entity of typeEntities) {
        const entityText = entityConverter.entityToText(entity);
        const entityTokens = tokenCounter.estimateTokens(entityText);
        
        // If adding this entity would exceed target size, create a chunk
        if (currentTokens + entityTokens > options.targetTokenSize && currentChunkEntities.length > 0) {
          const chunk = this.createTypeChunk(
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
        const chunk = this.createTypeChunk(
          currentChunkEntities,
          entityType,
          projectId,
          chunkIndex++
        );
        chunks.push(chunk);
      }
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
  
  private createTypeChunk(
    entities: IfcEntity[],
    entityType: string,
    projectId: string,
    index: number
  ): SmartChunk {
    const content = this.createTypeContent(entityType, entities);
    const summary = this.createTypeSummary(entityType, entities);
    
    const metadata: ChunkMetadata = {
      entityTypes: [entityType],
      entityCount: entities.length,
      entityIds: entities.map(e => e.expressID),
      properties: this.extractCommonProperties(entities),
    };
    
    return {
      id: `${projectId}-element-${index}-${Date.now()}`,
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
  
  private createTypeContent(entityType: string, entities: IfcEntity[]): string {
    const parts: string[] = [
      `# ${entityType} Elements`,
      '',
      `Total count: ${entities.length}`,
      '',
    ];
    
    // Add statistics
    const stats = this.calculateStatistics(entities);
    if (Object.keys(stats).length > 0) {
      parts.push('## Statistics:');
      for (const [key, value] of Object.entries(stats)) {
        parts.push(`- ${key}: ${value}`);
      }
      parts.push('');
    }
    
    // Add entity details
    parts.push('## Elements:');
    parts.push(entityConverter.entitiesToText(entities, {
      groupByType: false,
      includeProperties: true,
      maxEntitiesPerType: 200, // Higher limit since already grouped
    }));
    
    return parts.join('\n');
  }
  
  private createTypeSummary(entityType: string, entities: IfcEntity[]): string {
    const namedCount = entities.filter(e => e.name).length;
    const withPropsCount = entities.filter(e => e.properties && Object.keys(e.properties).length > 0).length;
    
    return `${entityType}: ${entities.length} elements (${namedCount} named, ${withPropsCount} with properties)`;
  }
  
  private calculateStatistics(entities: IfcEntity[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    // Count entities with names
    const namedCount = entities.filter(e => e.name).length;
    if (namedCount > 0) {
      stats['Named elements'] = `${namedCount}/${entities.length}`;
    }
    
    // Count unique object types
    const objectTypes = new Set(entities.map(e => e.objectType).filter(Boolean));
    if (objectTypes.size > 0) {
      stats['Object types'] = Array.from(objectTypes).join(', ');
    }
    
    // Count entities with descriptions
    const withDesc = entities.filter(e => e.description).length;
    if (withDesc > 0) {
      stats['With descriptions'] = withDesc;
    }
    
    return stats;
  }
  
  private extractCommonProperties(entities: IfcEntity[]): string[] {
    const propertyFrequency: Record<string, number> = {};
    
    // Count property occurrences
    for (const entity of entities) {
      if (entity.properties) {
        for (const prop of Object.keys(entity.properties)) {
          propertyFrequency[prop] = (propertyFrequency[prop] || 0) + 1;
        }
      }
    }
    
    // Return properties that appear in at least 50% of entities
    const threshold = entities.length * 0.5;
    return Object.entries(propertyFrequency)
      .filter(([_, count]) => count >= threshold)
      .map(([prop, _]) => prop)
      .sort();
  }
}



/**
 * Create default strategies
 */
export function createDefaultStrategies(): ChunkingStrategy[] {
  return [
    new SpatialChunkingStrategy(),
    new SystemChunkingStrategy(),
    new ElementTypeChunkingStrategy(),
  ];
}