import { Tool } from './tool-registry';
import { IfcEntity, IfcEntityIndex } from '@/types/bim';
// simplified search tool (no progressive/chunk logic)

interface SearchParams {
  query?: string;
  types?: string[];
  countOnly?: boolean;
  limit?: number;
  offset?: number;
}

export const createBimUniversalSearchTool = (
  entities: IfcEntity[],
  entityIndex: IfcEntityIndex,
  _chunkManager?: any
): Tool => ({
  name: 'bim_search',
  description: 'Search BIM entities by type and text. Returns counts and paginated results.',
  parameters: {
    type: 'object',
    properties: {
      query: { 
        type: 'string', 
        description: 'Text to search in entity names and properties (optional)'
      },
      types: { 
        type: 'array',
        items: { type: 'string' },
        description: 'Array of IFC types to filter (e.g., ["IfcWall", "IfcDoor"]). If not provided, searches all types.'
      },
      countOnly: {
        type: 'boolean',
        description: 'If true, only returns count without entity details'
      },
      limit: { 
        type: 'number',
        description: 'Maximum number of results to return (default: 100)'
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)'
      }
    },
    required: []
  },
  execute: async (params) => {
    const { 
      query, 
      types = [], 
      countOnly = false,
      limit = 100,
      offset = 0
    } = params as SearchParams;
    
    console.log(`🔍 [bim_search] Executing search:`, {
      query,
      types: types.length || 'all',
      countOnly,
      limit,
      offset
    });
    
    // Collect all matching entities
    let matchingEntities: IfcEntity[] = [];
    const typeCounts: Record<string, number> = {};
    
    // If types specified, use index for efficiency
    if (types.length > 0) {
      for (const type of types) {
        const typeIds = entityIndex[type] || [];
        typeCounts[type] = typeIds.length;
        
        if (!countOnly) {
          const typeEntities = typeIds
            .map(id => entities.find(e => e.expressID === id))
            .filter((e): e is IfcEntity => e !== undefined);
          matchingEntities.push(...typeEntities);
        }
      }
    } else {
      // Search all entities
      for (const entity of entities) {
        const matchesQuery = !query || (
          entity.name?.toLowerCase().includes(query.toLowerCase()) ||
          entity.type?.toLowerCase().includes(query.toLowerCase()) ||
          JSON.stringify(entity.properties).toLowerCase().includes(query.toLowerCase())
        );
        
        if (matchesQuery) {
          if (!typeCounts[entity.type]) {
            typeCounts[entity.type] = 0;
          }
          typeCounts[entity.type]++;
          
          if (!countOnly) {
            matchingEntities.push(entity);
          }
        }
      }
    }
    
    // Apply text query filter if provided
    if (query && !countOnly && types.length > 0) {
      matchingEntities = matchingEntities.filter(entity => 
        entity.name?.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(entity.properties).toLowerCase().includes(query.toLowerCase())
      );
    }
    
    const totalCount = matchingEntities.length;
    
    // Return count only if requested
    if (countOnly) {
      console.log(`✅ [bim_search] Count complete:`, typeCounts);
      return {
        totalCount: Object.values(typeCounts).reduce((a, b) => a + b, 0),
        typeCounts,
        types: Object.keys(typeCounts)
      };
    }
    
    // Apply pagination
    const paginatedEntities = matchingEntities.slice(offset, offset + limit);
    
    // Format results
    const examples = paginatedEntities.slice(0, 5).map(e => ({
      expressID: e.expressID,
      type: e.type,
      name: e.name || 'Unnamed',
      globalId: e.globalId
    }));
    
    console.log(`✅ [bim_search] Found ${totalCount} entities, returning ${paginatedEntities.length}`);
    
    return {
      totalCount,
      returnedCount: paginatedEntities.length,
      offset,
      limit,
      hasMore: offset + limit < totalCount,
      entityIds: paginatedEntities.map(e => e.expressID),
      examples,
      typeCounts: types.length === 0 ? typeCounts : undefined
    };
  }
});