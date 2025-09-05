/**
 * Improved Entity Extraction using SingleThreadedFragmentsModel methods
 * Based on fragments v3 documentation
 */

import { EventBus } from '@/core/events/event-bus';
import { IfcEntity, IfcEntityIndex, ExtractedEntity } from '@/types/bim';

export async function improvedEntityExtraction(model: any, modelId: string) {
  console.log("🚀 Starting improved entity extraction...");
  
  const entities: ExtractedEntity[] = [];
  const entityIndex: IfcEntityIndex = {};
  const spatialHierarchy: any = {};
  
  try {
    // 1. Get all categories (IFC types) - AWAIT the promise!
    const categories = model.getCategories ? await model.getCategories() : [];
    console.log(`📋 Found ${categories.length} categories:`, categories);
    
    // 2. Get spatial structure for hierarchy - AWAIT if it's a promise
    const spatialStructure = model.getSpatialStructure ? await model.getSpatialStructure() : null;
    if (spatialStructure) {
      console.log("🏗️ Spatial structure available");
      processSpatialStructure(spatialStructure, spatialHierarchy);
    }
    
    // 3. Get items with geometry (skip empty spatial elements) - AWAIT if needed
    const itemsWithGeometry = model.getItemsWithGeometry ? await model.getItemsWithGeometry() : [];
    console.log(`🎨 Found ${itemsWithGeometry.length} items with geometry`);
    
    // 4. Process each category
    for (const category of categories) {
      try {
        // Get all items of this category
        const categoryRegex = new RegExp(category);
        const itemsByCategory = model.getItemsOfCategories ? 
          await model.getItemsOfCategories([categoryRegex]) : {};
        const itemIds = itemsByCategory[category] || [];
        
        if (itemIds.length === 0) continue;
        
        console.log(`Processing ${itemIds.length} items of type ${category}`);
        
        // Get detailed data for these items
        const itemsData = model.getItemsData ? 
          await model.getItemsData(itemIds, {
            globalIds: true,
            types: true,
            properties: true
          }) : [];
        
        // Get GUIDs
        const guids = model.getGuidsByLocalIds ? 
          await model.getGuidsByLocalIds(itemIds) : [];
        
        // Get positions if available
        const positions = model.getPositions ? 
          await model.getPositions(itemIds) : [];
        
        // Create entities
        itemsData.forEach((itemData: any, index: number) => {
          const localId = itemIds[index];
          const guid = guids[index] || `GUID_${localId}`;
          const position = positions[index];
          
          const entity: ExtractedEntity = {
            expressID: localId,
            localId: localId,
            type: category,
            category: category,
            name: itemData.Name?.value || itemData.name || `${category}_${localId}`,
            globalId: guid,
            properties: itemData,
            position: position ? {
              x: position.x || 0,
              y: position.y || 0,
              z: position.z || 0
            } : undefined,
            spatialParent: findSpatialParent(localId, spatialHierarchy)
          };
          
          entities.push(entity);
          
          // Update index
          if (!entityIndex[category]) {
            entityIndex[category] = [];
          }
          entityIndex[category].push(localId);
        });
        
      } catch (error) {
        console.warn(`Failed to process category ${category}:`, error);
      }
    }
    
    // 5. Fallback: If no categories method, try basic extraction
    if (categories.length === 0 && model.getItemsData) {
      console.log("⚠️ No categories found, trying fallback extraction");
      
      const maxId = model.getMaxLocalId ? await model.getMaxLocalId() : 1000;
      const allIds = Array.from({ length: maxId }, (_, i) => i + 1);
      const validIds = itemsWithGeometry.length > 0 ? itemsWithGeometry : allIds;
      
      const itemsData = model.getItemsData ? 
        await model.getItemsData(validIds) : [];
      itemsData.forEach((item: any, index: number) => {
        if (item) {
          const entity: ExtractedEntity = {
            expressID: validIds[index],
            localId: validIds[index],
            type: item.type || 'Unknown',
            category: item.type || 'Unknown',
            name: item.Name?.value || item.name || `Entity_${validIds[index]}`,
            globalId: item.GlobalId?.value || `GUID_${validIds[index]}`,
            properties: item
          };
          entities.push(entity);
          
          const type = entity.type;
          if (!entityIndex[type]) {
            entityIndex[type] = [];
          }
          entityIndex[type].push(entity.expressID);
        }
      });
    }
    
    console.log(`✅ Extracted ${entities.length} entities with improved method`);
    
    // Store in window.__bimData
    (window as any).__bimData = {
      ...(window as any).__bimData,
      entities,
      entityIndex,
      spatialHierarchy,
      extractionMethod: 'improved',
      modelMetadata: model.getMetadata?.() || {}
    };
    
    // Emit event
    EventBus.emit('entities:loaded', {
      entities,
      entityIndex,
      count: entities.length
    });
    
    return {
      entities,
      entityIndex,
      spatialHierarchy,
      success: true
    };
    
  } catch (error) {
    console.error("❌ Improved extraction failed:", error);
    throw error;
  }
}

// Helper function to process spatial structure
function processSpatialStructure(node: any, hierarchy: any, parent?: string) {
  if (!node) return;
  
  hierarchy[node.id] = {
    ...node,
    parent,
    children: node.children?.map((c: any) => c.id) || []
  };
  
  if (node.children) {
    node.children.forEach((child: any) => {
      processSpatialStructure(child, hierarchy, node.id);
    });
  }
}

// Helper function to find spatial parent
function findSpatialParent(itemId: number, hierarchy: any): string | undefined {
  for (const [spatialId, spatial] of Object.entries(hierarchy)) {
    if ((spatial as any).items?.includes(itemId)) {
      return spatialId;
    }
  }
  return undefined;
}

// Smart Chunking optimization using spatial data
export function createSpatialChunks(
  entities: ExtractedEntity[], 
  spatialHierarchy: any
): Map<string, ExtractedEntity[]> {
  const chunks = new Map<string, ExtractedEntity[]>();
  
  // Group entities by spatial parent
  entities.forEach(entity => {
    const chunkKey = entity.spatialParent || 'no_spatial_parent';
    if (!chunks.has(chunkKey)) {
      chunks.set(chunkKey, []);
    }
    chunks.get(chunkKey)!.push(entity);
  });
  
  console.log(`📦 Created ${chunks.size} spatial chunks`);
  return chunks;
}

// Category-based chunking with size limits
export function createCategoryChunks(
  entities: ExtractedEntity[],
  maxChunkSize: number = 50
): Map<string, ExtractedEntity[]> {
  const chunks = new Map<string, ExtractedEntity[]>();
  
  // Group by category
  const byCategory = new Map<string, ExtractedEntity[]>();
  entities.forEach(entity => {
    if (!byCategory.has(entity.category)) {
      byCategory.set(entity.category, []);
    }
    byCategory.get(entity.category)!.push(entity);
  });
  
  // Split large categories into smaller chunks
  byCategory.forEach((categoryEntities, category) => {
    if (categoryEntities.length <= maxChunkSize) {
      chunks.set(category, categoryEntities);
    } else {
      // Split into multiple chunks
      for (let i = 0; i < categoryEntities.length; i += maxChunkSize) {
        const chunkIndex = Math.floor(i / maxChunkSize);
        chunks.set(`${category}_chunk_${chunkIndex}`, 
          categoryEntities.slice(i, i + maxChunkSize)
        );
      }
    }
  });
  
  console.log(`📦 Created ${chunks.size} category chunks`);
  return chunks;
}