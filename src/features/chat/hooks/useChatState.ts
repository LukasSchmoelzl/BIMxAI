import { useState } from 'react';
import { ChatMessage, ChatState } from '@/types/chat';

export function useChatState() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isProcessing: false,
    error: null,
    hasModel: false,
    currentPhase: null,
  });

  const [entities, setEntities] = useState<any[]>([]);
  const [entityIndex, setEntityIndex] = useState<any>({});
  const [inputValue, setInputValue] = useState('');
  const [smartChunkProjectId, setSmartChunkProjectId] = useState<string | null>(null);
  const [useSmartChunks, setUseSmartChunks] = useState(false);

  const addMessage = (message: ChatMessage) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };

  const updateChatState = (updates: Partial<ChatState>) => {
    setChatState(prev => ({ ...prev, ...updates }));
  };

  const clearMessages = () => {
    setChatState(prev => ({ ...prev, messages: [] }));
  };

  return {
    // State
    chatState,
    entities,
    entityIndex,
    inputValue,
    smartChunkProjectId,
    useSmartChunks,
    
    // Setters
    setEntities,
    setEntityIndex,
    setInputValue,
    setSmartChunkProjectId,
    setUseSmartChunks,
    
    // Actions
    addMessage,
    updateChatState,
    clearMessages,
  };
} 