import { Tool } from './tool-registry';
import { IfcEntity } from '@/types/bim';

type HighlightCallback = (expressIds: number[], globalIds: string[]) => Promise<void> | void;

export const createBimHighlightTool = (onHighlight: HighlightCallback, entities: IfcEntity[]): Tool => ({
  name: 'bim_highlight',
  description: 'Highlight entities in 3D viewer by their express IDs. Use this after querying entities to make them visible in the 3D model.',
  parameters: {
    type: 'object',
    properties: {
      entityIds: { 
        type: 'array', 
        items: { type: 'number' },
        description: 'Array of express IDs to highlight (obtained from query_ifc_entities)'
      }
    },
    required: ['entityIds']
  },
  execute: async (params) => {
    const { entityIds } = params as { entityIds: number[] };
    // console.log(`🔦 [highlight_entities] Starting highlight for ${entityIds.length} entities`);
    
    // Convert express IDs to global IDs
    const globalIds: string[] = [];
    const validExpressIds: number[] = [];
    const notFound: number[] = [];
    
    for (const expressId of entityIds) {
      const entity = entities.find(e => e.expressID === expressId);
      if (entity && entity.globalId) {
        globalIds.push(entity.globalId);
        validExpressIds.push(expressId);
        
        // Log entity properties when highlighting
        console.log(entity);
      } else {
        notFound.push(expressId);
      }
    }
    
    // console.log(`🔦 [highlight_entities] Conversion result:`);
    // console.log(`   ✅ Found: ${validExpressIds.length} entities with global IDs`);
    if (notFound.length > 0) {
      console.warn(`   ⚠️ Not found: ${notFound.length} express IDs:`, notFound.slice(0, 5), notFound.length > 5 ? '...' : '');
    }
    
    // Call the highlight callback with both arrays
    await onHighlight(validExpressIds, globalIds);
    // console.log(`✅ [highlight_entities] Highlight callback executed`);
    
    return { 
      highlighted: validExpressIds.length,
      expressIds: validExpressIds,
      globalIds: globalIds
    };
  }
}); 