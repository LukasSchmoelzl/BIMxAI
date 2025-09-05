import React, { useRef, useCallback } from 'react';
import ClaudePipeline from '../components/ClaudePipeline';
import SmartChunksPipeline from '../components/SmartChunksPipeline';

interface UseAIPipelineProps {
  onResult: (result: any) => void;
  onError: (error: string) => void;
  onPhaseChange?: (phase: string) => void;
  entities: any[];
  entityIndex: any;
  modelContext?: string;
  useSmartChunks?: boolean;
  smartChunkProjectId?: string;
}

export function useAIPipeline({
  onResult,
  onError,
  onPhaseChange,
  entities,
  entityIndex,
  modelContext,
  useSmartChunks = false,
  smartChunkProjectId
}: UseAIPipelineProps) {
  const pipelineRef = useRef<any>(null);

  const processMessage = useCallback(async (message: string, chatHistory?: Array<{role: 'user' | 'assistant', content: string}>) => {
    if (pipelineRef.current) {
      return pipelineRef.current.processMessage(message, chatHistory);
    } else {
      console.error('❌ Pipeline not initialized');
      onError('Pipeline not initialized');
    }
  }, [onError]);

  const getPipelineComponent = useCallback(() => {
    if (useSmartChunks && smartChunkProjectId) {
      return (
        <SmartChunksPipeline
          ref={pipelineRef}
          onResult={onResult}
          onError={onError}
          onPhaseChange={onPhaseChange}
          entities={entities}
          entityIndex={entityIndex}
          modelContext={modelContext}
          useSmartChunks={true}
          smartChunkProjectId={smartChunkProjectId}
        />
      );
    } else {
      return (
        <ClaudePipeline
          ref={pipelineRef}
          onResult={onResult}
          onError={onError}
          onPhaseChange={onPhaseChange}
          entities={entities}
          entityIndex={entityIndex}
          modelContext={modelContext}
        />
      );
    }
  }, [
    useSmartChunks,
    smartChunkProjectId,
    onResult,
    onError,
    onPhaseChange,
    entities,
    entityIndex,
    modelContext
  ]);

  return {
    processMessage,
    getPipelineComponent,
    pipelineRef
  };
} 