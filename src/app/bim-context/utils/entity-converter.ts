/**
 * Convert IFC entities to text representations
 */

import { IfcEntity } from '@/types/bim';

export class EntityConverter {
  /**
   * Convert single entity to readable text
   */
  entityToText(entity: IfcEntity): string {
    const parts: string[] = [];
    
    // Basic info
    parts.push(`${entity.type} (ID: ${entity.expressID})`);
    
    if (entity.name) {
      parts.push(`Name: ${entity.name}`);
    }
    
    if (entity.description) {
      parts.push(`Description: ${entity.description}`);
    }
    
    if (entity.objectType) {
      parts.push(`Object Type: ${entity.objectType}`);
    }
    
    if (entity.tag) {
      parts.push(`Tag: ${entity.tag}`);
    }
    
    // Properties
    if (entity.properties && Object.keys(entity.properties).length > 0) {
      const propStrings = Object.entries(entity.properties)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `  ${key}: ${value}`);
      
      if (propStrings.length > 0) {
        parts.push('Properties:');
        parts.push(...propStrings);
      }
    }
    
    return parts.join('\n');
  }
  
  /**
   * Convert multiple entities to structured text
   */
  entitiesToText(entities: IfcEntity[], options?: {
    includeProperties?: boolean;
    groupByType?: boolean;
    maxEntitiesPerType?: number;
  }): string {
    const opts = {
      includeProperties: true,
      groupByType: true,
      maxEntitiesPerType: 100,
      ...options
    };
    
    if (!opts.groupByType) {
      return entities
        .slice(0, opts.maxEntitiesPerType)
        .map(e => this.entityToText(e))
        .join('\n\n');
    }
    
    // Group by type
    const grouped = this.groupByType(entities);
    const parts: string[] = [];
    
    for (const [type, typeEntities] of Object.entries(grouped)) {
      parts.push(`\n## ${type} (${typeEntities.length} entities)`);
      
      const entitiesToShow = typeEntities.slice(0, opts.maxEntitiesPerType);
      
      for (const entity of entitiesToShow) {
        if (opts.includeProperties) {
          parts.push('\n' + this.entityToText(entity));
        } else {
          parts.push(`- ${entity.name || 'Unnamed'} (ID: ${entity.expressID})`);
        }
      }
      
      if (typeEntities.length > opts.maxEntitiesPerType) {
        parts.push(`... and ${typeEntities.length - opts.maxEntitiesPerType} more`);
      }
    }
    
    return parts.join('\n');
  }
  
  /**
   * Create a summary of entities
   */
  createSummary(entities: IfcEntity[]): string {
    const grouped = this.groupByType(entities);
    const summary: string[] = [];
    
    summary.push(`Total entities: ${entities.length}`);
    summary.push(`Entity types: ${Object.keys(grouped).length}`);
    summary.push('\nBreakdown by type:');
    
    // Sort by count descending
    const sorted = Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length);
    
    for (const [type, typeEntities] of sorted) {
      summary.push(`- ${type}: ${typeEntities.length}`);
    }
    
    return summary.join('\n');
  }
  
  /**
   * Group entities by type
   */
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
  
  /**
   * Extract spatial information from entities
   */
  extractSpatialInfo(entities: IfcEntity[]): {
    floors: Set<number>;
    hasPositions: number;
    boundingBox?: { min: [number, number, number]; max: [number, number, number] };
  } {
    const floors = new Set<number>();
    let hasPositions = 0;
    
    // Note: The current IfcEntity interface doesn't have spatial data
    // This is a placeholder for when spatial data is added
    for (const entity of entities) {
      // Check for floor info in properties
      if (entity.properties?.floor !== undefined) {
        floors.add(Number(entity.properties.floor));
      }
      
      // Check for position data (would need to be added to interface)
      if (entity.properties?.x !== undefined && 
          entity.properties?.y !== undefined && 
          entity.properties?.z !== undefined) {
        hasPositions++;
      }
    }
    
    return {
      floors,
      hasPositions
    };
  }
}

export const entityConverter = new EntityConverter();