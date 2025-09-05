"use client";

import React, { useEffect, useState } from 'react';
import { EventBus } from '@/core/events/event-bus';
import { chunkRegistry } from '@/core/chunks/chunk-registry';
import { improvedEntityExtraction } from './improved-entity-extraction';
import { inMemoryChunkSystem } from '@/app/bim-context/in-memory-chunk-system';

// Entity extraction function with Smart Chunks integration
async function extractEntitiesFromModel(model: any) {
  console.log("🚀 extractEntitiesFromModel called with model:", model);
  
  if (!model) {
    throw new Error("No model provided to extractEntitiesFromModel");
  }
  
  try {
    console.log("📝 Extracting entities from model...");
    
    // First try the improved extraction with new Fragment v3 methods
    if (model.getCategories || model.getItemsData || model.getSpatialStructure) {
      console.log("✨ Using improved entity extraction with Fragment v3 methods");
      const result = await improvedEntityExtraction(model, (window as any).__bimData?.modelId || 'model');
      
      if (result.success && result.entities.length > 0) {
        // Upload to Smart Chunks with spatial data
        await uploadToSmartChunks(result.entities, result.entityIndex, result.spatialHierarchy);
        return;
      }
    }
    
    // Fallback to old method if new methods not available
    if (model.getAllPropertiesOfType || model.getProperties) {
      console.log("✅ Model has property methods - using proper IFC data extraction");
      
      // Get all IFC types from the model
      const ifcTypes = ['IFCWALL', 'IFCDOOR', 'IFCWINDOW', 'IFCSLAB', 'IFCCOLUMN', 'IFCBEAM', 'IFCSTAIR', 'IFCSPACE'];
      const entities: any[] = [];
      const entityIndex: Record<string, number[]> = {};
      
      for (const type of ifcTypes) {
        try {
          const props = await model.getAllPropertiesOfType(type);
          if (props && props.length > 0) {
            console.log(`Found ${props.length} entities of type ${type}`);
            
            props.forEach((prop: any) => {
              entities.push({
                expressID: prop.expressID,
                type: type,
                name: prop.Name?.value || `${type}_${prop.expressID}`,
                globalId: prop.GlobalId?.value || `GUID_${prop.expressID}`,
                properties: prop
              });
              
              if (!entityIndex[type]) {
                entityIndex[type] = [];
              }
              entityIndex[type].push(prop.expressID);
            });
          }
        } catch (e) {
          // Type might not exist in this model
        }
      }
      
      // Update window.__bimData
      (window as any).__bimData = {
        ...(window as any).__bimData,
        entities,
        entityIndex,
        entityTypes: Object.keys(entityIndex),
        entityData: entities
      };
      
      console.log(`✅ Extracted ${entities.length} entities with full IFC properties`);
      
      // Emit event
      EventBus.emit('entities:loaded', {
        entities,
        entityIndex
      });
      
      // Upload to Smart Chunks
      await uploadToSmartChunks(entities, entityIndex);
      
      return;
    }
    
    // Fallback: Extract only Express IDs from geometry (less ideal)
    console.log("⚠️ Model lacks property methods - extracting only Express IDs from geometry");
    const expressIds = new Set<number>();
    
    if (model.object) {
      model.object.traverse((child: any) => {
        if (child.isMesh && child.geometry?.attributes?.expressID) {
          const expressIDArray = child.geometry.attributes.expressID.array;
          for (let i = 0; i < expressIDArray.length; i++) {
            if (expressIDArray[i] > 0) {
              expressIds.add(expressIDArray[i]);
            }
          }
        }
      });
    }
    
    console.log(`📊 Found ${expressIds.size} unique express IDs (no properties available)`);
    
    // Create minimal entities from express IDs
    const entities: any[] = [];
    const entityIndex: Record<string, number[]> = { 'Unknown': [] };
    
    expressIds.forEach(id => {
      entities.push({
        expressID: id,
        type: 'Unknown',
        name: `Entity_${id}`,
        globalId: `GUID_${id}`,
        properties: {}
      });
      entityIndex['Unknown'].push(id);
    });
    
    if (entities.length === 0) {
      console.warn("⚠️ No entities found in the model");
      return;
    }
    
    // Update window.__bimData
    (window as any).__bimData = {
      ...(window as any).__bimData,
      entities,
      entityIndex,
      entityTypes: ['Unknown'],
      entityData: entities
    };
    
    // Emit event
    EventBus.emit('entities:loaded', {
      entities,
      entityIndex
    });
    
    console.log(`✅ Entity extraction complete: ${entities.length} entities (properties unavailable)`);
    
    // Upload to Smart Chunks
    await uploadToSmartChunks(entities, entityIndex);
    
  } catch (error) {
    console.error('❌ Failed to extract entities:', error);
    throw error;
  }
}

// Process entities with In-Memory Smart Chunks
async function uploadToSmartChunks(entities: any[], entityIndex: Record<string, number[]>, spatialHierarchy?: any) {
  console.log('🧩 SMART CHUNKS: Processing in-memory...');
  
  try {
    const modelName = (window as any).__bimData?.modelId || 'default-model';
    const projectId = `${modelName}_project`;
    
    // Process entities into chunks (in-memory)
    const result = await inMemoryChunkSystem.processEntities(
      projectId,
      entities,
      entityIndex,
      spatialHierarchy
    );
    
    if (!result.success) {
      throw new Error('Failed to create chunks');
    }
    
    console.log(`✅ SMART CHUNKS: Created ${result.chunkCount} chunks with ${result.totalTokens} tokens`);
    
    // Store Smart Chunks data in window
    (window as any).__bimData = {
      ...(window as any).__bimData,
      smartChunks: {
        projectId,
        enabled: true,
        chunkCount: result.chunkCount,
        totalTokens: result.totalTokens,
        inMemory: true
      }
    };
    
    (window as any).__smartChunksProjectId = projectId;
    (window as any).__smartChunkSystem = inMemoryChunkSystem;
    
    // The event is already emitted by the chunk system
    console.log('✅ SMART CHUNKS: In-memory integration complete!');
    
  } catch (error) {
    console.error('❌ Smart Chunks processing failed:', error);
    // Continue without Smart Chunks
  }
}

interface QueryHandlerProps {
  viewer: {
    currentModelRef: React.RefObject<any>;
  };
  isInitialized: boolean;
  modelName: string;
}

const QueryHandler: React.FC<QueryHandlerProps> = ({ 
  viewer, 
  isInitialized, 
  modelName 
}) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  useEffect(() => {
    console.log("\n=== QUERYHANDLER MOUNTED ===");
    console.log("🎯 QueryHandler simplified - ready to handle model events");
    console.log("[DEBUG] isInitialized:", isInitialized);
    console.log("[DEBUG] modelName:", modelName);
    console.log("[DEBUG] viewer.currentModelRef.current:", viewer.currentModelRef.current);
  }, []);

  // Handler for when fragment is loaded
  const handleFragmentLoaded = async (data: { fragment: any, expressIds?: number[] }) => {
      if (isModelLoaded) return; // Skip if already processed
      
      console.log(`\n✅ FRAGMENT LOADED EVENT`);
      setIsModelLoaded(true);
      
      // Store the model reference
      (window as any).__bimData = {
        model: data.fragment,
        modelId: (window as any).__bimData?.modelId || 'model',
        loaded: true
      };
      
      // Extract entities immediately
      try {
        console.log("🔍 Starting entity extraction...");
        await extractEntitiesFromModel(data.fragment);
        console.log("✅ Entity extraction completed");
      } catch (error) {
        console.error("❌ Entity extraction failed:", error);
      }
      
      // Emit model loaded event
      EventBus.emit('model:loaded', { 
        name: (window as any).__bimData?.modelId || 'model', 
        stats: { loaded: true }
      });
  };

  // Listen for fragment loaded event
  useEffect(() => {
    if (!isInitialized) return;
    
    const unsubscribe = EventBus.on('fragment:loaded', handleFragmentLoaded);
    return unsubscribe;
  }, [isInitialized, handleFragmentLoaded]);
  
  // Check once if model is already loaded (for page refresh scenarios)
  useEffect(() => {
    if (!isInitialized || isModelLoaded) return;
    
    if (viewer.currentModelRef.current) {
      console.log("🔄 Model already loaded on mount, processing...");
      // Trigger the fragment loaded handler manually
      handleFragmentLoaded({ 
        fragment: viewer.currentModelRef.current
      });
    }
  }, [isInitialized]);

  // Listen for model clear
  useEffect(() => {
    console.log("[DEBUG] Setting up model:clear listener");
    const handleClear = () => {
      console.log('\n🧹 MODEL CLEARED');
      setIsModelLoaded(false);
      console.log("[DEBUG] isModelLoaded set to false");
    };
    
    const unsubscribe = EventBus.on('model:clear', handleClear);
    return unsubscribe;
  }, []);

  return null;
};

export default QueryHandler;