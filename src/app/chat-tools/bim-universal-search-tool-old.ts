import { Tool } from './tool-registry';
import { IfcEntity, IfcEntityIndex } from '@/types/bim';

interface SearchParamsOld {
  query?: string;
  types?: string[];
  countOnly?: boolean;
  limit?: number;
  offset?: number;
}

// Legacy search without progressive/chunk hints
export const createBimUniversalSearchToolOld = (
  entities: IfcEntity[],
  entityIndex: IfcEntityIndex,
): Tool => ({
  name: 'bim_search_old',
  description: 'Legacy universal search for BIM entities (no progressive/chunk output).',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      types: { type: 'array', items: { type: 'string' } },
      countOnly: { type: 'boolean' },
      limit: { type: 'number' },
      offset: { type: 'number' },
    },
    required: []
  },
  execute: async (params) => {
    const { query, types = [], countOnly = false, limit = 100, offset = 0 } = params as SearchParamsOld;

    let matching: IfcEntity[] = [];
    const typeCounts: Record<string, number> = {};

    if (types.length > 0) {
      for (const type of types) {
        const ids = entityIndex[type] || [];
        typeCounts[type] = ids.length;
        if (!countOnly) {
          const ents = ids.map(id => entities.find(e => e.expressID === id)).filter((e): e is IfcEntity => !!e);
          matching.push(...ents);
        }
      }
    } else {
      for (const entity of entities) {
        const matches = !query || (
          entity.name?.toLowerCase().includes(query.toLowerCase()) ||
          entity.type?.toLowerCase().includes(query.toLowerCase()) ||
          JSON.stringify(entity.properties).toLowerCase().includes(query.toLowerCase())
        );
        if (matches) {
          typeCounts[entity.type] = (typeCounts[entity.type] || 0) + 1;
          if (!countOnly) matching.push(entity);
        }
      }
    }

    if (query && !countOnly && types.length > 0) {
      matching = matching.filter(e =>
        e.name?.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(e.properties).toLowerCase().includes(query.toLowerCase())
      );
    }

    const totalCount = matching.length;
    if (countOnly) {
      return {
        totalCount: Object.values(typeCounts).reduce((a, b) => a + b, 0),
        typeCounts,
        types: Object.keys(typeCounts),
      };
    }

    const page = matching.slice(offset, offset + limit);
    const examples = page.slice(0, 5).map(e => ({
      expressID: e.expressID,
      type: e.type,
      name: e.name || 'Unnamed',
      globalId: e.globalId,
    }));

    return {
      totalCount,
      returnedCount: page.length,
      offset,
      limit,
      hasMore: offset + limit < totalCount,
      entityIds: page.map(e => e.expressID),
      examples,
      typeCounts: types.length === 0 ? typeCounts : undefined,
    };
  }
});


