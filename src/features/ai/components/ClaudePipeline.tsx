"use client";

import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';

import ClaudeClient from '../services/claude-client';
import { ClaudeConfig } from '@/types/claude';
import { 
  ToolRegistry, 
  ToolChainExecutor,
  createBimUniversalSearchTool,
  createBimHighlightTool,
  createBimTypeListTool,
  createBimEntityDetailTool,
  createBimSpatialGeometryTool,
  createBimChunkManagementTool,
  bimSelectionContextTool
} from '@/app/chat-tools';
import { EventBus } from '@/core/events/event-bus';
import { OctreeBuilder } from '@/core/spatial/octree-builder';
import { ChunkManager } from '@/core/chunks/chunk-manager';


interface ClaudePipelineProps {
  onResult: (result: {
    userMessage: string;
    assistantResponse: string;
    queryResult?: any;
    highlightedEntities?: number[];
  }) => void;
  onError: (error: string) => void;
  onPhaseChange?: (phase: string) => void;
  entities: any[];
  entityIndex: any;
  modelContext?: string;
}

const ClaudePipeline = forwardRef<
  { processMessage: (message: string) => Promise<void> },
  ClaudePipelineProps
>(({
  onResult,
  onError,
  onPhaseChange,
  entities,
  entityIndex,
  modelContext
}, ref) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [octreeReader, setOctreeReader] = useState<any>(null);
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [chunkManager, setChunkManager] = useState<any>(null);
  
  // ChunkManager wird über chunks:ready Event gesetzt
  
  const config: ClaudeConfig = {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.3,
  };

  const claudeClient = new ClaudeClient(config);

  // Listen for spatial index ready events
  useEffect(() => {
    const handleSpatialIndexReady = async (event: any) => {
      console.log('🌳 Spatial index ready event received');
      
      try {
        const { fragmentId, octreeBuffer } = event;
        
        // Deserialize the octree
        const reader = OctreeBuilder.deserialize(octreeBuffer);
        setOctreeReader(reader);
        setCurrentModelId(fragmentId);
        
        const metadata = reader.getMetadata();
        console.log(`🌳 Spatial index loaded: ${metadata.totalEntities} entities, ${metadata.totalNodes} nodes`);
      } catch (error) {
        console.error('Failed to load spatial index:', error);
      }
    };
    
    // Handle chunks ready event
    const handleChunksReady = (event: any) => {
      console.log('📦 Chunks ready event received');
      
      try {
        const { chunkManager: cm, chunkCount, totalEntities } = event;
        setChunkManager(cm);
        
        console.log(`📦 Chunk system ready: ${chunkCount} chunks, ${totalEntities} entities`);
      } catch (error) {
        console.error('Failed to handle chunks ready:', error);
      }
    };
    
    // Subscribe to events - on() returns unsubscribe functions
    const unsubscribeSpatial = EventBus.on('spatial:index:ready' as any, handleSpatialIndexReady);
    const unsubscribeChunks = EventBus.on('chunks:ready' as any, handleChunksReady);
    
    // Cleanup - call the unsubscribe functions
    return () => {
      unsubscribeSpatial();
      unsubscribeChunks();
    };
  }, []);

  const processMessage = async (userMessage: string, chatHistory?: Array<{role: 'user' | 'assistant', content: string}>) => {
    if (isProcessing) {
      console.warn('Claude Pipeline ist bereits in Bearbeitung');
      return;
    }
    
    console.log('🚀 Claude Pipeline:', userMessage.substring(0, 50) + '...');
    console.log('[DEBUG] window.__bimData:', (window as any).__bimData);
    console.log('[DEBUG] __bimData.loaded:', (window as any).__bimData?.loaded);
    console.log('[DEBUG] __bimData.entities?.length:', (window as any).__bimData?.entities?.length);
    
    // Check if Smart Chunks is available
    const smartChunksProjectId = (window as any).__smartChunksProjectId;
    
    setIsProcessing(true);
    onPhaseChange?.('plan');
    
    try {
      // If Smart Chunks is available, get context from it
      let smartChunksContext = '';
      if (smartChunksProjectId) {
        // Direkt aus dem Speicher laden statt API
        const smartChunksData = (window as any).__smartChunksData;
        if (smartChunksData) {
          // Einfacher Context aus den vorhandenen Daten
          smartChunksContext = `\n\n## Smart Chunks Context:\n`;
          smartChunksContext += `- Total Entities: ${smartChunksData.entities?.length || 0}\n`;
          smartChunksContext += `- Entity Types: ${Object.keys(smartChunksData.entityIndex || {}).join(', ')}\n`;
          smartChunksContext += `- Available Chunks: ${smartChunksData.chunks?.length || 0}\n`;
          
          // Beispiel-Entities hinzufügen
          if (smartChunksData.entities && smartChunksData.entities.length > 0) {
            smartChunksContext += `\n### Example Entities:\n`;
            smartChunksData.entities.slice(0, 3).forEach((e: any) => {
              smartChunksContext += `- ${e.type}: ${e.name} (ID: ${e.expressID})\n`;
            });
          }
          
          console.log('📦 Smart Chunks loaded from memory');
        }
      }
      
      // BIM Daten aus globalem Kontext laden
      const bimData = (window as any).__bimData;
      const entities = bimData?.entities || [];
      const entityIndex = bimData?.entityIndex || {};
      const chunkManager = bimData?.chunkManager;
      const octreeReader = bimData?.octreeReader;
      
      // Tool Registry initialisieren
      const registry = new ToolRegistry();
      
      // Tools registrieren (6 konsolidierte Tools)
      
      // 1. Universal Search (combines search, count, progressive)
      registry.register(createBimUniversalSearchTool(entities, entityIndex, chunkManager));
      
      // 2. Entity Details
      registry.register(createBimEntityDetailTool(entities));
      
      // 3. Type List
      registry.register(createBimTypeListTool(entities, entityIndex));
      
      // 4. Spatial & Geometry (combines spatial search and geometry analysis)
      registry.register(createBimSpatialGeometryTool(entities, octreeReader));
      
      // 5. Chunk Management (combines status and analysis)
      registry.register(createBimChunkManagementTool(chunkManager));
      
      // Highlight callback function
      const handleHighlight = (expressIds: number[], globalIds: string[]) => {
        // console.log('🔦 Highlighting entities:', expressIds.length, 'with global IDs:', globalIds.length);
        
        // Emit AI highlight event for the 3D viewer
        EventBus.emit('ai:highlight', {
          expressIds,
          globalIds
        });
      };
      
      registry.register(createBimHighlightTool(handleHighlight, entities));
      
      // Register selected entities context tool
      registry.register(bimSelectionContextTool);
      
      // Tool Chain Executor erstellen
      const executor = new ToolChainExecutor(registry, claudeClient, {
        maxIterations: 5
      });
      
      // Context erstellen
      const context = {
        modelLoaded: entities.length > 0,
        entityCount: entities.length,
        entityTypes: Object.keys(entityIndex || {}),
        modelContext: modelContext,
        smartChunksContext: smartChunksContext, // Add Smart Chunks context
        smartChunksAvailable: !!smartChunksProjectId,
        smartChunksProjectId: smartChunksProjectId
      };
      
      console.log('📊 Context für LLM:', {
        modelLoaded: context.modelLoaded,
        entityCount: context.entityCount,
        smartChunksAvailable: context.smartChunksAvailable,
        smartChunksContextLength: smartChunksContext?.length || 0,
        entitiesFromBimData: entities.length,
        bimDataLoaded: bimData?.loaded
      });

      onPhaseChange?.('execution');
      
      // Tool Chain ausführen
      // console.log('🔗 Executing tool chain...');
      console.log('🔗 Context:', context);
      const result = await executor.execute(userMessage, context);
      
      // Check for errors in the result
      if (result.error) {
        console.error('Tool Chain error:', result.error);
        
        let errorMessage: string;
        
        // Handle specific error types
        switch (result.error.code) {
          case 'CLAUDE_OVERLOADED':
            errorMessage = 'Die KI-Server sind aktuell überlastet. Bitte versuche es in 30 Sekunden erneut.';
            break;
          case 'RATE_LIMITED':
            errorMessage = 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.';
            break;
          case 'API_ERROR':
            errorMessage = `API-Fehler: ${result.error.message}`;
            break;
          default:
            errorMessage = result.error.message || 'Ein unerwarteter Fehler ist aufgetreten';
        }
        
        onError(errorMessage);
        return;
      }
      
      // console.log('✅ Tool Chain completed:', {
      //   toolsExecuted: result.toolCalls.length,
      //   finalAnswer: result.finalAnswer
      // });
      
      // Extract highlighted entities if any
      let highlightedEntities: number[] = [];
      let highlightedGlobalIds: string[] = [];
      let highlightedExamples: any[] = [];
      const highlightCall = result.toolCalls.find(call => call.tool === 'highlight_entities');
      if (highlightCall && highlightCall.output) {
        // The highlight tool returns { highlighted: number, expressIds: number[], globalIds: string[] }
        const output = highlightCall.output as any;
        if (output.result) {
          highlightedEntities = output.result.expressIds || [];
          highlightedGlobalIds = output.result.globalIds || [];
        } else {
          // Fallback for old format
          highlightedEntities = output.expressIds || output || [];
        }
        // console.log(`📍 Extracted highlight data: ${highlightedEntities.length} express IDs, ${highlightedGlobalIds.length} global IDs`);
        
        // Create examples from highlighted entities for display
        if (highlightedEntities.length > 0 && entities.length > 0) {
          highlightedExamples = highlightedEntities.slice(0, 20).map(id => {
            const entity = entities.find((e: any) => e.expressID === id);
            return entity || { expressID: id, type: 'UNKNOWN', name: `Entity ${id}` };
          }).filter(Boolean);
          // console.log(`📍 Created ${highlightedExamples.length} examples from highlighted entities`);
        }
      }
      
      // Extract query results if any
      let queryResult = undefined;
      const queryCall = result.toolCalls.find(call => 
        call.tool === 'query_ifc_entities' || 
        call.tool === 'count_entities' ||
        call.tool === 'list_entity_types'
      );
      if (queryCall && queryCall.output) {
        // Tools return { result, duration } from executeTool
        const output = queryCall.output as any;
        const rawResult = output.result || output;
        // console.log(`📊 Extracted raw query result:`, rawResult);
        
        // Check if this is a count_entities result (only has count, no examples)
        if (queryCall.tool === 'count_entities' && !rawResult.examples && !rawResult.results) {
          // console.log(`📊 Count tool result - no examples to display`);
        } else if (rawResult.success && rawResult.examples) {
          // New format with success, examples, etc.
          queryResult = rawResult;
          // console.log(`📊 Using new format with ${rawResult.examples.length} examples`);
        } else if (rawResult.results) {
          // Old format - need to transform it
          // console.log(`📊 Transforming old format result`);
          queryResult = {
            success: true,
            count: rawResult.count || 0,
            entityIds: rawResult.entityIds || [],
            examples: rawResult.results || []
          };
        }
        
        if (queryResult) {
          // console.log(`📊 Final query result with ${queryResult.examples?.length || 0} examples`);
        }
      }
      
      // If we have highlighted entities but no query result, create one
      if (!queryResult && highlightedExamples.length > 0) {
        queryResult = {
          success: true,
          count: highlightedEntities.length,
          entityIds: highlightedEntities,
          examples: highlightedExamples
        };
        // console.log(`📊 Created query result from ${highlightedExamples.length} highlighted entities`);
      }
      
      // Ergebnis senden
      onResult({
        userMessage,
        assistantResponse: result.finalAnswer,
        queryResult,
        highlightedEntities
      });
      
    } catch (error) {
      console.error('Claude Pipeline error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ein unerwarteter Fehler ist aufgetreten';
      
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
      onPhaseChange?.('');
    }
  };

  useImperativeHandle(ref, () => ({
    processMessage
  }));

  return null;
});

ClaudePipeline.displayName = 'ClaudePipeline';

export default ClaudePipeline; 