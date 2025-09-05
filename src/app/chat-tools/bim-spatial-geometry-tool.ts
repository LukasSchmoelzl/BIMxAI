import { Tool } from './tool-registry';
import { IfcEntity } from '@/types/bim';
import { SpatialGeometryParams } from '@/types/tools';

export const createBimSpatialGeometryTool = (entities: IfcEntity[], octree?: any): Tool => ({
  name: 'bim_spatial_geometry',
  description: 'Analyze spatial and geometric properties of BIM entities. Can calculate volumes, areas, find entities in regions, or near points.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['bounds', 'volume', 'area', 'spatial_search', 'geometry_info'],
        description: 'Operation to perform: bounds (get bounding box), volume, area, spatial_search (find in region), geometry_info (all properties)'
      },
      entityIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'Entity IDs to analyze (for geometry operations)'
      },
      region: {
        type: 'object',
        properties: {
          minX: { type: 'number' },
          maxX: { type: 'number' },
          minY: { type: 'number' },
          maxY: { type: 'number' },
          minZ: { type: 'number' },
          maxZ: { type: 'number' }
        },
        description: '3D region for spatial search'
      },
      nearPoint: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' }
        },
        description: 'Point for proximity search'
      },
      radius: {
        type: 'number',
        description: 'Radius for proximity search (default: 5)'
      }
    },
    required: ['operation']
  },
  execute: async (params) => {
    const { operation, entityIds = [], region, nearPoint, radius = 5 } = params as SpatialGeometryParams;
    
    console.log(`📐 [bim_spatial_geometry] Operation: ${operation}`);
    
    switch (operation) {
      case 'spatial_search': {
        // Find entities in spatial region or near point
        const matchingEntities: any[] = [];
        
        if (octree && (region || nearPoint)) {
          // Use octree for optimized search
          if (nearPoint) {
            const nearbyIds = octree.query(nearPoint, radius);
            for (const id of nearbyIds) {
              const entity = entities.find(e => e.expressID === id);
              if (entity) matchingEntities.push(entity);
            }
          } else if (region) {
            const regionIds = octree.queryRegion(region);
            for (const id of regionIds) {
              const entity = entities.find(e => e.expressID === id);
              if (entity) matchingEntities.push(entity);
            }
          }
        } else {
          // Fallback: brute force search using properties
          for (const entity of entities) {
            const props = entity.properties as any;
            
            // Try to extract position from properties
            if (props?.ObjectPlacement?.RelativePlacement?.Location) {
              const loc = props.ObjectPlacement.RelativePlacement.Location;
              const x = loc.Coordinates?.[0] || 0;
              const y = loc.Coordinates?.[1] || 0;
              const z = loc.Coordinates?.[2] || 0;
              
              if (nearPoint) {
                const distance = Math.sqrt(
                  Math.pow(x - nearPoint.x, 2) +
                  Math.pow(y - nearPoint.y, 2) +
                  Math.pow(z - nearPoint.z, 2)
                );
                if (distance <= radius) {
                  matchingEntities.push({ ...entity, distance });
                }
              } else if (region) {
                if ((!region.minX || x >= region.minX) &&
                    (!region.maxX || x <= region.maxX) &&
                    (!region.minY || y >= region.minY) &&
                    (!region.maxY || y <= region.maxY) &&
                    (!region.minZ || z >= region.minZ) &&
                    (!region.maxZ || z <= region.maxZ)) {
                  matchingEntities.push(entity);
                }
              }
            }
          }
        }
        
        return {
          operation: 'spatial_search',
          found: matchingEntities.length,
          entityIds: matchingEntities.map(e => e.expressID),
          examples: matchingEntities.slice(0, 5).map(e => ({
            expressID: e.expressID,
            type: e.type,
            name: e.name || 'Unnamed',
            distance: e.distance
          }))
        };
      }
      
      case 'geometry_info':
      case 'volume':
      case 'area':
      case 'bounds': {
        // Analyze geometry of specific entities
        const results: any[] = [];
        let totalVolume = 0;
        let totalArea = 0;
        const bounds = {
          min: { x: Infinity, y: Infinity, z: Infinity },
          max: { x: -Infinity, y: -Infinity, z: -Infinity }
        };
        
        for (const id of entityIds) {
          const entity = entities.find(e => e.expressID === id);
          if (!entity) continue;
          
          const props = entity.properties as any;
          const result: any = {
            expressID: id,
            type: entity.type,
            name: entity.name
          };
          
          // Try to extract geometric properties
          if (props?.Representation?.Representations) {
            const representations = props.Representation.Representations;
            for (const rep of representations) {
              if (rep.RepresentationType === 'SweptSolid' || rep.RepresentationType === 'Brep') {
                // Extract dimensions if available
                if (rep.Items?.[0]?.SweptArea) {
                  const area = rep.Items[0].SweptArea;
                  if (area.XDim && area.YDim) {
                    result.width = area.XDim;
                    result.height = area.YDim;
                    result.area = area.XDim * area.YDim;
                    totalArea += result.area;
                  }
                }
                if (rep.Items?.[0]?.Depth) {
                  result.depth = rep.Items[0].Depth;
                  if (result.area) {
                    result.volume = result.area * result.depth;
                    totalVolume += result.volume;
                  }
                }
              }
            }
          }
          
          // Update bounds
          if (props?.ObjectPlacement?.RelativePlacement?.Location) {
            const loc = props.ObjectPlacement.RelativePlacement.Location;
            const x = loc.Coordinates?.[0] || 0;
            const y = loc.Coordinates?.[1] || 0;
            const z = loc.Coordinates?.[2] || 0;
            
            bounds.min.x = Math.min(bounds.min.x, x);
            bounds.min.y = Math.min(bounds.min.y, y);
            bounds.min.z = Math.min(bounds.min.z, z);
            bounds.max.x = Math.max(bounds.max.x, x);
            bounds.max.y = Math.max(bounds.max.y, y);
            bounds.max.z = Math.max(bounds.max.z, z);
            
            result.position = { x, y, z };
          }
          
          if (operation === 'geometry_info') {
            results.push(result);
          }
        }
        
        // Return based on operation
        switch (operation) {
          case 'volume':
            return { operation: 'volume', totalVolume, entityCount: entityIds.length };
          case 'area':
            return { operation: 'area', totalArea, entityCount: entityIds.length };
          case 'bounds':
            return { operation: 'bounds', bounds, entityCount: entityIds.length };
          case 'geometry_info':
            return { 
              operation: 'geometry_info',
              entities: results,
              summary: { totalVolume, totalArea, bounds }
            };
        }
      }
    }
    
    return { error: 'Invalid operation or parameters' };
  }
});