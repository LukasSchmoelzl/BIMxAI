"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useEventBusApi } from '@/core/events/event-bus';
import { ChatMessage } from '@/types/chat';
import { useChatState } from '../hooks/useChatState';
import { useChatEvents, createEntityInfoMessage } from '../hooks/useChatEvents';
import { useAIPipeline } from '@/features/ai/hooks/useAIPipeline';

// Create Context
const ChatContext = createContext<any>(undefined);

// Provider Component
interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { emit } = useEventBusApi();
  
  // State Management
  const {
    chatState,
    entities,
    entityIndex,
    inputValue,
    smartChunkProjectId,
    useSmartChunks,
    setEntities,
    setEntityIndex,
    setInputValue,
    setSmartChunkProjectId,
    setUseSmartChunks,
    addMessage,
    updateChatState,
  } = useChatState();

  // Event Handlers
  const handleEntitiesLoaded = (data: any) => {
    console.log('📊 New entities loaded:', {
      entityCount: data.entities?.length || 0,
      entityTypes: Object.keys(data.entityIndex || {})
    });
    setEntities(data.entities || []);
    setEntityIndex(data.entityIndex || {});
    updateChatState({ hasModel: true });
  };

  const handleEntityClicked = (data: any) => {
    console.log('🖱️ Entity clicked:', data);
    const infoMessage = createEntityInfoMessage(data);
    addMessage(infoMessage);
  };

  const handleSmartChunksReady = (data: any) => {
    console.log('🧩 Smart Chunks ready:', data);
    setSmartChunkProjectId(data.projectId);
    setUseSmartChunks(true);
  };

  // Event Subscription
  useChatEvents({
    onEntitiesLoaded: handleEntitiesLoaded,
    onEntityClicked: handleEntityClicked,
    onSmartChunksReady: handleSmartChunksReady,
  });

  // AI Pipeline
  const handleClaudeResult = (result: any) => {
    const sanitize = (text: string) => (text || '').replace(/\*/g, '');

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: sanitize(result.assistantResponse || result.response || result.finalAnswer || 'Ich konnte keine Antwort generieren.'),
      timestamp: new Date().toISOString(),
    };

    addMessage(assistantMessage);
    updateChatState({ isProcessing: false, currentPhase: null });

    // Emit AI highlight directly if we have entity IDs
    if (result.queryResult && result.queryResult.entityIds && result.queryResult.entityIds.length > 0) {
      try {
        emit('ai:highlight', {
          expressIds: result.queryResult.entityIds,
          globalIds: [],
        } as any);
      } catch {}
    }
  };

  const handleClaudeError = (error: Error | string) => {
    console.error('❌ Claude Pipeline Error:', error);
    updateChatState({ 
      error: typeof error === 'string' ? error : error.message,
      isProcessing: false 
    });
  };

  const handlePhaseChange = (phase: string) => {
    updateChatState({ currentPhase: phase });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || chatState.isProcessing) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    updateChatState({ isProcessing: true, error: null });
    setInputValue('');
    
    // Trigger AI Pipeline
    console.log('🚀 Triggering AI Pipeline with message:', inputValue.trim());
    if (aiPipelineRef.current) {
      // Nur die letzten 5 User/Assistant-Paare (≈10 Nachrichten) senden
      const nonSystemMessages = chatState.messages.filter(msg => msg.role !== 'system');
      const lastTen = nonSystemMessages.slice(-10);
      const chatHistory = lastTen.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      aiPipelineRef.current.processMessage(userMessage.content, chatHistory);
    } else {
      console.error('❌ AI Pipeline not initialized!');
    }
  };

  const handleKeyDown = (_e: React.KeyboardEvent) => {
    // Handle special key combinations if needed
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    // Verwende useEffect für die Ausführung nach dem State-Update
    requestAnimationFrame(() => {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    });
  };

  const handleDismissError = () => {
    updateChatState({ error: null });
  };

  const getModelContext = () => {
    if (!entities.length) return '';
    
    const entityTypes = Object.keys(entityIndex || {});
    const totalEntities = entities.length;
    
    return `BIM Model geladen: ${totalEntities} Entities, Typen: ${entityTypes.join(', ')}`;
  };

  // AI Pipeline Setup
  const { processMessage, getPipelineComponent, pipelineRef: aiPipelineRef } = useAIPipeline({
    onResult: handleClaudeResult,
    onError: handleClaudeError,
    onPhaseChange: handlePhaseChange,
    entities,
    entityIndex,
    modelContext: getModelContext(),
    useSmartChunks,
    smartChunkProjectId,
  });

  const value = {
    // State
    chatState,
    entities,
    entityIndex,
    inputValue,
    smartChunkProjectId,
    useSmartChunks,
    
    // Actions
    setInputValue,
    handleSubmit,
    handleKeyDown,
    handleQuickAction,
    handleDismissError,
    handlePhaseChange,
    getModelContext,
  };

  return (
    <ChatContext.Provider value={value}>
      {getPipelineComponent()}
      {children}
    </ChatContext.Provider>
  );
}

// Hook to use Chat Context
export function useChatContext() {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
} 