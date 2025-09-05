"use client";

import { useState, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';

// ClaudeConfig was defined in claude-client.ts
import { ClaudeConfig } from '../services/claude-client';
import { 
  createBimUniversalSearchTool,
  createBimHighlightTool,
  createBimTypeListTool,
  createBimEntityDetailTool,
  createBimSpatialGeometryTool,
  createBimChunkManagementTool,
  bimSelectionContextTool
} from '@/app/chat-tools';
import { SmartChunksToolChainExecutor } from '@/app/chat-tools/smart-chunks-tool-chain-executor';
import { ToolRegistry } from '@/app/chat-tools/tool-registry';
import ClaudeClient from '../services/claude-client';
import { EventBus } from '@/core/events/event-bus';
// Smart chunks imports removed - will use API routes instead

interface SmartChunksClaudePipelineProps {
  onResult: (result: {
    userMessage: string;
    assistantResponse: string;
    queryResult?: any;
    highlightedEntities?: number[];
    contextUsed?: boolean;
    chunksUsed?: number;
  }) => void;
  onError: (error: string) => void;
  onPhaseChange?: (phase: string) => void;
  entities: any[];
  entityIndex: any;
  modelContext?: string;
  // Smart Chunks specific props
  useSmartChunks?: boolean;
  smartChunkProjectId?: string;
  onContextChange?: (context: any) => void;
}

const SmartChunksClaudePipeline = forwardRef<
  { processMessage: (message: string) => Promise<void> },
  SmartChunksClaudePipelineProps
>(({
  onResult,
  onError,
  onPhaseChange,
  entities,
  entityIndex,
  modelContext,
  useSmartChunks = false,
  smartChunkProjectId,
  onContextChange
}, ref) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [smartChunkProvider, setSmartChunkProvider] = useState<any>(null);
  
  const config: ClaudeConfig = {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.3,
  };

  const claudeClient = new ClaudeClient(config);

  // Smart chunks provider disabled - needs to use API routes
  useEffect(() => {
    if (useSmartChunks && smartChunkProjectId) {
      console.log('🧩 Smart Chunks is enabled but needs API integration');
      // TODO: Create API route for smart chunks context
      setSmartChunkProvider(null);
    } else {
      setSmartChunkProvider(null);
    }
  }, [useSmartChunks, smartChunkProjectId]);

  const processMessage = async (userMessage: string, chatHistory?: Array<{role: 'user' | 'assistant', content: string}>) => {
    if (isProcessing) {
      console.warn('Claude Pipeline ist bereits in Bearbeitung');
      return;
    }
    
    console.log('🚀 Smart Chunks Claude Pipeline startet für:', userMessage);
    setIsProcessing(true);
    onPhaseChange?.('plan');
    
    try {
      // Check if Smart Chunks should be used
      let enhancedContext = '';
      let chunksUsed = 0;
      let smartChunksParams: any = null;
      
      if (useSmartChunks && smartChunkProjectId) {
        console.log('🧩 Smart Chunks enabled - will use tool parameters for context selection');
        // Smart chunks context will be fetched after tool selection
      }
      
      onPhaseChange?.('tools');
      
      // Tool Registry initialisieren
      const registry = new ToolRegistry();
      
      // Tools registrieren (7 konsolidierte Tools)
      registry.register(createBimUniversalSearchTool(entities, entityIndex, null)); // No chunk manager in SmartChunks mode
      registry.register(createBimEntityDetailTool(entities));
      registry.register(createBimTypeListTool(entities, entityIndex));
      registry.register(createBimSpatialGeometryTool(entities, null)); // No octree in SmartChunks mode
      registry.register(createBimChunkManagementTool(null)); // Will show "not available" message
      registry.register(bimSelectionContextTool); // Selection context tool
      
      // Highlight callback function
      const handleHighlight = (expressIds: number[], globalIds: string[]) => {
        // Emit AI highlight event for the 3D viewer
        EventBus.emit('ai:highlight', {
          expressIds,
          globalIds
        });
      };
      
      registry.register(createBimHighlightTool(handleHighlight, entities));
      
      // Tool Chain Executor erstellen
      const executor = new SmartChunksToolChainExecutor(registry, claudeClient, {
        maxIterations: 5,
        includeThoughts: true,
        retryOnError: true,
        maxRetries: 2
      });
      
      // Set Smart Chunks project ID if enabled
      if (useSmartChunks && smartChunkProjectId) {
        executor.setSmartChunksProjectId(smartChunkProjectId);
      }
      
      // Context erstellen
      const context = {
        modelLoaded: entities.length > 0,
        entityCount: entities.length,
        entityTypes: Object.keys(entityIndex || {}),
        modelContext: modelContext
      };
      
      // Query ausführen
      const result = await executor.execute(userMessage, context, chatHistory);
      
      // Extract Smart Chunks usage
      if (result.smartChunksUsed) {
        chunksUsed = result.smartChunksUsed;
        console.log(`✅ Smart Chunks used: ${chunksUsed} chunks`);
        onContextChange?.({ source: 'smart-chunks', chunks: chunksUsed });
      }
      
      // Final answer generieren
      onPhaseChange?.('respond');
      let finalAnswer = result.finalAnswer || '';
      
      // If no final answer, generate one
      if (!finalAnswer && result.toolCalls.length > 0) {
        const lastToolResult = result.toolCalls[result.toolCalls.length - 1];
        
        const prompt = `
Basierend auf der Benutzeranfrage: "${userMessage}"

${context.smartChunksContext ? `Smart Chunks Kontext:\n${context.smartChunksContext}\n` : ''}

Und dem Tool-Ergebnis:
${JSON.stringify(lastToolResult.output, null, 2)}

Bitte gib eine präzise und freundliche Antwort auf Deutsch.
Wenn es sich um eine Zählung handelt, nenne die genaue Anzahl.
Wenn Elemente gefunden wurden, beschreibe sie kurz.
`;

        const response = await claudeClient.generatePlan(prompt, context);
        finalAnswer = response.content;
      }
      
      // Extract highlighted entities
      const highlightedEntities: number[] = [];
      result.toolCalls.forEach(call => {
        if (call.tool === 'highlight_entities' && (call.output as any)?.expressIds) {
          highlightedEntities.push(...(call.output as any).expressIds);
        }
      });
      
      // Erfolg
      onResult({
        userMessage,
        assistantResponse: finalAnswer,
        queryResult: result.toolCalls,
        highlightedEntities,
        contextUsed: useSmartChunks && chunksUsed > 0,
        chunksUsed
      });
      
    } catch (error) {
      console.error('🔴 Pipeline-Fehler:', error);
      
      if (error instanceof Error) {
        onError(error.message);
      } else {
        onError('Ein unerwarteter Fehler ist aufgetreten.');
      }
    } finally {
      setIsProcessing(false);
      onPhaseChange?.('');
    }
  };

  // Expose processMessage method
  useImperativeHandle(ref, () => ({
    processMessage
  }));

  // Update project ID when it changes
  useEffect(() => {
    if (smartChunkProvider && smartChunkProjectId) {
      smartChunkProvider.setProjectId(smartChunkProjectId);
    }
  }, [smartChunkProjectId, smartChunkProvider]);

  return null;
});

SmartChunksClaudePipeline.displayName = 'SmartChunksClaudePipeline';

export default SmartChunksClaudePipeline;