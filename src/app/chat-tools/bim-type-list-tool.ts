import { Tool } from './tool-registry';
import { IfcEntity, IfcEntityIndex } from '@/types/bim';

export const createBimTypeListTool = (entities: IfcEntity[], entityIndex: IfcEntityIndex): Tool => ({
  name: 'bim_type_list',
  description: 'List all available entity types with examples',
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Maximum number of examples per type (default: 3)' }
    }
  },
  execute: async (params) => {
    const { limit = 3 } = params as { limit?: number };
    // console.log(`📊 [list_entity_types] Listing all entity types with up to ${limit} examples each`);
    
    // Get all entity types with counts
    const typeBreakdown = Object.entries(entityIndex).map(([type, ids]) => ({
      type,
      count: (ids as number[]).length,
      ids: ids as number[]
    })).sort((a, b) => b.count - a.count);
    
    // Collect examples for each type
    const examples: IfcEntity[] = [];
    
    for (const typeInfo of typeBreakdown) {
      // Get first few entities of this type as examples
      const exampleIds = typeInfo.ids.slice(0, limit);
      
      for (const id of exampleIds) {
        const entity = entities.find((e) => e.expressID === id);
        if (entity) {
          // Add type count info to the entity name
          examples.push({
            ...entity,
            name: `${typeInfo.type} (${typeInfo.count} total) - ${entity.name || 'No name'}`
          });
        }
      }
    }
    
    // console.log(`✅ [list_entity_types] Found ${typeBreakdown.length} types, returning ${examples.length} examples`);
    
    return {
      success: true,
      count: examples.length,
      entityIds: examples.map(e => e.expressID),
      examples: examples,
      typeCount: typeBreakdown.length,
      totalEntities: entities.length
    };
  }
});