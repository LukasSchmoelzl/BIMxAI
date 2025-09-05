import { Tool } from './tool-registry';
import { IfcEntity } from '@/types/bim';

export const createBimEntityDetailTool = (entities: IfcEntity[]): Tool => ({
  name: 'bim_entity_detail',
  description: 'Get detailed information about a specific IFC entity by its express ID. Use this to get properties and details of a single entity.',
  parameters: {
    type: 'object',
    properties: {
      expressId: { 
        type: 'number', 
        description: 'The express ID of the entity to retrieve' 
      },
      includeProperties: {
        type: 'boolean',
        description: 'Include all properties of the entity (default: true)'
      }
    },
    required: ['expressId']
  },
  execute: async (params) => {
    const { expressId, includeProperties = true } = params as { 
      expressId: number; 
      includeProperties?: boolean 
    };
    
    // console.log(`🔍 [get_entity_by_id] Looking for entity with expressId: ${expressId}`);
    
    const entity = entities.find(e => e.expressID === expressId);
    
    if (!entity) {
      // console.log(`❌ [get_entity_by_id] Entity not found: ${expressId}`);
      return {
        success: false,
        error: `No entity found with expressId: ${expressId}`,
        expressId
      };
    }
    
    // console.log(`✅ [get_entity_by_id] Found entity: ${entity.type} [${expressId}]`);
    
    const result: any = {
      success: true,
      expressId: entity.expressID,
      type: entity.type,
      globalId: entity.globalId,
      name: entity.name || 'Unnamed',
      description: entity.description,
      objectType: entity.objectType,
      tag: entity.tag
    };
    
    if (includeProperties && entity.properties) {
      result.properties = entity.properties;
      result.propertyCount = Object.keys(entity.properties).length;
    }
    
    // Add summary info
    result.summary = `${entity.type} [${entity.expressID}]: ${entity.name || 'Unnamed'}`;
    
    return result;
  }
});